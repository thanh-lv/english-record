import { useEffect, useState } from "react";
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

  const streak = calculateStreak(myRecordings);

  useEffect(() => {
    const fetchTopics = async () => {
      setTopicsLoading(true);
      try {
        const topicType = isBongBe ? "bongbe" : "standard";
        const { data, error } = await supabase
          .from("topics")
          .select("*, questions(*)")
          .eq("type", topicType)
          .order("order_index");
        if (error) throw error;

        const normalized = (data || []).map((t: any) => ({
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
  }, [isBongBe]);

  useEffect(() => {
    if (!user) return;

    const fetchRecordings = async () => {
      try {
        const { data, error } = await supabase
          .from("recordings")
          .select("*")
          .eq("studentName", profile.name.trim());
        if (error) throw error;
        if (data) {
          setMyRecordings(data);
          setCompletedNumbers(data.map((rec: any) => rec.topicNumber));
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
          filter: `studentName=eq.${profile.name.trim()}`,
        },
        (payload) => {
          setMyRecordings((prev) => [...prev, payload.new]);
          setCompletedNumbers((prev) => [...prev, payload.new.topicNumber]);
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
        const targetAgeGroup = studentAge <= 5 ? "kindergarten" : "primary";
        const { data, error } = await supabase
          .from("stories")
          .select("*")
          .eq("age_group", targetAgeGroup)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setDbStories(data || []);
      } catch (err) {
        console.error("Error fetching stories:", err);
      }
    };
    fetchStories();
  }, [studentAge]);

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
