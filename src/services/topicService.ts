import { supabase } from "../lib/supabase";
import { Topic, Question } from "../types";

export const topicService = {
  async fetchAllTopics(): Promise<Topic[]> {
    const { data, error } = await supabase
      .from("topics")
      .select("*, questions(*)")
      .order("order_index");

    if (error) throw error;

    return (data || []).map((t: any) => ({
      ...t,
      questions: (t.questions || []).sort(
        (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0),
      ),
    }));
  },

  async toggleTopicActive(
    topicId: string,
    currentValue: boolean,
  ): Promise<void> {
    const { error } = await supabase
      .from("topics")
      .update({ is_active: !currentValue })
      .eq("id", topicId);
    if (error) throw error;
  },

  async updateTopicTitle(topicId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from("topics")
      .update({ title })
      .eq("id", topicId);
    if (error) throw error;
  },

  async createTopic(
    title: string,
    type: "standard" | "bongbe",
    orderIndex: number,
  ): Promise<void> {
    const { error } = await supabase.from("topics").insert({
      title,
      type,
      order_index: orderIndex,
      is_active: true,
    });
    if (error) throw error;
  },

  async deleteTopic(topicId: string): Promise<void> {
    const { error } = await supabase.from("topics").delete().eq("id", topicId);
    if (error) throw error;
  },

  async createQuestion(questionData: Partial<Question>): Promise<void> {
    const { error } = await supabase.from("questions").insert(questionData);
    if (error) throw error;
  },

  async updateQuestion(
    questionId: string,
    questionData: Partial<Question>,
  ): Promise<void> {
    const { error } = await supabase
      .from("questions")
      .update(questionData)
      .eq("id", questionId);
    if (error) throw error;
  },

  async deleteQuestion(questionId: string): Promise<void> {
    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", questionId);
    if (error) throw error;
  },

  async insertParsedQuestions(
    topicId: string,
    questions: { text: string; sample_answer?: string }[],
    startingOrder: number,
  ): Promise<void> {
    let order = startingOrder;
    const rows = questions.map((q) => ({
      topic_id: topicId,
      text: q.text,
      sample_answer: q.sample_answer || null,
      order_index: order++,
    }));
    const { error } = await supabase.from("questions").insert(rows);
    if (error) throw error;
  },
};
