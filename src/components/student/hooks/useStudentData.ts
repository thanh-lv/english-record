import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { calculateStreak } from "../../../utils";

export function useStudentData(
  user: any,
  profile: any,
  isBongBe: boolean,
  studentAge: number,
) {
  const [activeTopics, setActiveTopics] = useState<any[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [myRecordings, setMyRecordings] = useState<any[]>([]);
  const [completedNumbers, setCompletedNumbers] = useState<number[]>([]);
  const [dbStories, setDbStories] = useState<any[]>([]);

  const streak = useMemo(() => calculateStreak(myRecordings), [myRecordings]);

  useEffect(() => {
    const fetchTopics = async () => {
      setTopicsLoading(true);
      try {
        const topicType = isBongBe ? "bongbe" : "standard";
        const studentGrade = profile?.grade ? Number(profile.grade) : null;
        const { data, error } = await supabase
          .from("topics")
          .select("*, questions(*)")
          .eq("type", topicType)
          .eq("is_active", true)
          .order("order_index");
        if (error) throw error;

        const normalized = (data || [])
          .filter((t: any) => {
            if (!studentGrade) return true;
            if (
              !t.grades ||
              !Array.isArray(t.grades) ||
              t.grades.length === 0
            ) {
              return true;
            }
            return t.grades.includes(studentGrade);
          })
          .map((t: any) => ({
            ...t,
            questions: (t.questions || []).sort(
              (a: any, b: any) => a.order_index - b.order_index,
            ),
          }));
        setActiveTopics(normalized);
      } catch (err) {
        console.error("Error fetching topics:", err);
      } finally {
        setTopicsLoading(false);
      }
    };
    fetchTopics();
  }, [isBongBe, profile?.grade]);

  useEffect(() => {
    if (!user) return;

    const fetchRecordings = async () => {
      try {
        const { data, error } = await supabase
          .from("recordings")
          .select(
            "id, topic_number, audio_url, created_at, teacher_rating, teacher_feedback, student_reaction, question_id, question_text, topic, topic_id",
          )
          .eq("student_name", profile.name.trim());
        if (error) throw error;
        if (data) {
          setMyRecordings(data);
          setCompletedNumbers(data.map((rec: any) => rec.topic_number));
        }
      } catch (err) {
        console.error("Error downloading student progress:", err);
      }
    };

    fetchRecordings();

    const channel = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "recordings",
          filter: `student_name=eq.${profile.name.trim()}`,
        },
        (payload) => {
          setMyRecordings((prev) => [...prev, payload.new]);
          setCompletedNumbers((prev) => [...prev, payload.new.topic_number]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile.name]);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const studentGrade = profile?.grade ? Number(profile.grade) : null;
        const { data, error } = await supabase
          .from("stories")
          .select("id, title, type, emoji, image_url, content, grades, is_active")
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        if (error) throw error;

        const filtered = (data || []).filter((s: any) => {
          if (!studentGrade) return true;
          if (!s.grades || !Array.isArray(s.grades) || s.grades.length === 0) {
            return true;
          }
          return s.grades.includes(studentGrade);
        });

        setDbStories(filtered);
      } catch (err) {
        console.error("Error fetching stories:", err);
      }
    };
    fetchStories();
  }, [profile?.grade]);

  return {
    activeTopics,
    topicsLoading,
    myRecordings,
    setMyRecordings,
    completedNumbers,
    setCompletedNumbers,
    dbStories,
    streak,
  };
}
