"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";

interface MarkdownFile {
  id: string;
  title: string;
  description: string;
  content: string;
}

const markdownFiles: MarkdownFile[] = [
  {
    id: "sample-response",
    title: "Alex Murithi Session 1",
    description: "Analysis of the second session with fidelity grades and behavioral flags",
    content: `
## 1. Fidelity Grade

Based on the provided rubric and my analysis, here are the scores for the session:

| Question # | Statement                                                                                      | Rating (1-7) | Justification                                                                                                                                                                                                                                                                                                                         |
| :--------- | :--------------------------------------------------------------------------------------------- | :----------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1**      | The group leader followed the study protocol and delivered the required content.               |   **7**      | **Entirely Agree.** The leader covered all the key content for an introductory session: program introduction, rules of confidentiality (\`~86s-119s\`), the concept of growth and neuroplasticity, the reading of two illustrative stories (\`~843s\` and \`~915s\`), and a personal reflection/writing activity (\`~1076s\`).                            |
| **2**      | The group leader adhered to the specifications around the content delivered.                    |   **5**      | **Somewhat Agree.** The leader did facilitate some discussions and had students read from the booklet as specified. However, a significant portion of the session, particularly the introduction (\`~119s-278s\`), was delivered as a long monologue rather than a facilitated, interactive introduction, which deviates from the facilitative spirit of the protocol. |
| **3**      | The group leader delivered the required content thoroughly.                                    |   **4**      | **Neither Agree nor Disagree.** While the leader *mentioned* all the required topics, the delivery often lacked depth. The very fast pace, evidenced by the short mean speech gap (0.68s), prevented any deep exploration of the concepts. Critically, a student's disclosure of drug abuse (\`~807s\`) was not explored at all, which is a major lapse in thoroughness. |
| **4**      | The group leader delivered the required content skillfully.                                    |   **3**      | **Somewhat Disagree.** The leader's high energy (high \`pitch_diversity\`) and use of code-switching were engaging. However, key facilitation skills were lacking. The session was dominated by the leader's monologues and rapid-fire questions, with minimal use of skillful validation, connecting between students, or comfortable silence. The dismissal of a serious disclosure was particularly unskillful. |
| **5**      | The group leader delivered the required content clearly and accessibly.                         |   **7**      | **Entirely Agree.** The leader's language was simple, and his frequent use of Swahili (\`mkoje\`, \`sawa\`) and relatable examples made the content highly accessible to the students. The students appeared to understand the instructions and concepts presented.                                                                                       |
| **6**      | The group leader did not add content from outside the protocol.                                |   **7**      | **Entirely Agree.** The leader adhered strictly to the prescribed content. His personal story about struggling with math was an appropriate use of self-disclosure to illustrate a protocol concept, not an addition of new material.                                                                                                            |
|            | **Overall Score**                                                                              | **5.5/7**    | **Adequate Fidelity, Needs Skill Development.** The leader demonstrated excellent fidelity in covering the required content points but needs significant development in the core therapeutic skills of facilitation, pacing, and handling disclosures to increase the quality and impact of the session. |

---

## 2. Qualitative Feedback

### Overall Summary

This session was characterized by very high energy and excellent adherence to the content checklist of the protocol for a first session. The leader, David, succeeded in covering all the introductory material and maintained an engaging and fast-paced environment. The audio features, with a high \`quick_exchange_ratio\` (0.68) and high \`pitch_diversity\` (381), confirm a very animated and interactive session. However, the session's primary weakness lies in a lack of therapeutic depth. The pace was often too fast to allow for reflection, and the leader missed a critical opportunity to skillfully handle a student's disclosure of drug use, prioritizing pace over process.

### Strengths

1.  **Strong Content Adherence:** The leader was meticulous in covering every required component of the introductory session. He clearly explained the program's purpose, the rules of confidentiality, the core concept of neuroplasticity, and facilitated the reading of the prescribed stories.

2.  **Engaging and Accessible Style:** The leader's energetic delivery and frequent, natural use of code-switching created a vibrant and relatable atmosphere. This approach is effective for building initial rapport with high school students and making the material less intimidating.

3.  **Good Use of Self-Disclosure:** Midway through the session (\`~1032s\`), the leader shared a personal story about his own past struggles with math. This was an excellent application of a leadership technique, as it served to normalize the students' academic challenges, model vulnerability, and demonstrate the principle of growth in a tangible way.

### Weaknesses & Areas for Improvement

1.  **Over-reliance on Monologue:** The beginning of the session (\`~119s\` to \`~278s\`) was a very long lecture. While the content was accurate, this style is contrary to the protocol's emphasis on *facilitation*. A more skillful approach would involve breaking up this information with questions to the group (e.g., "What does confidentiality mean to you all?") to make the learning more active and less passive.

2.  **Superficial Validation and Rushed Pacing:** The leader's responses to student shares were often brief affirmations ("That's nice," "Thanks for sharing") followed by a quick transition to the next topic. This rapid pace, while energetic, sacrifices the reflective space needed for therapeutic work. For example, when a student shared feeling like a "clown," the response was quick and did not explore the feeling itself.

3.  **Poor Handling of a Critical Disclosure:** The most significant area for improvement occurred around the \`807s\` mark when a student disclosed, *"Relationship with my friends. Say I've been using drugs... Abuse drugs. Yeah."* The leader's response was, *"Definitely. Okay, thank you for sharing that,"* before immediately pivoting to the next activity. This is a critical miss. Such a disclosure requires the leader to **pause the session's agenda**, validate the student's courage in sharing, and create a moment of safety and support. Rushing past it can make the student feel dismissed and regret sharing, and signals to the group that sensitive topics are not truly welcome.
    *   **Recommendation:** This incident must be used as a key coaching moment. The leader needs to be trained on a "Stop and Support" protocol. When a flag like drug abuse or self-harm is raised, the immediate priority is the student's well-being. The leader should validate the feeling ("That sounds like a really tough thing to deal with. Thank you for trusting us."), briefly explore it if appropriate, and remind the student of options for support, including talking to the leader privately after the session, as outlined in the protocol.

---

## 3. Flags for Behavior

*   **Drug Abuse:** There is a clear flag for potential drug abuse. Around \`807s\`, a student states, **"I've been using drugs... Abuse drugs."** This requires immediate attention from the program's supervisory and safeguarding team to ensure the student's safety and well-being are addressed.`
  },
  {
    id: "converted-response",
    title: "Alex Murithi Session 2",
    description: "Analysis of the session focused on Growth Mindset with fidelity grades",
    content: `
## 1. Fidelity Grade

Based on the provided rubric and my analysis, here are the scores for the session:

| Question # | Statement | Rating (1-7) | Justification |
| :--------- | :--------- | :----------: | :------------ |
| **1** | The group leader followed the study protocol and delivered the required content. | **3** | The facilitator did not adhere to several mandatory protocol elements. The explanation of confidentiality was incomplete; it missed the crucial jovial example about 'setting the school dorm on fire' and the specific condition for breaking it (danger to self/others), instead giving a generic doctor-patient analogy ('in cases that are too extreme'). Key therapeutic skills like Rephrasing, Connecting Between Students, and the 3-step Reflecting process were largely absent. While the session covered the 'Growth Mindset' topic, the execution lacked adherence to the specific techniques required by the protocol. |
| **2** | The group leader adhered to the specifications around the content delivered. | **4** | The facilitator addressed the main content topic of 'Growth Mindset' and 'Neuroplasticity'. They used the provided materials, having students read from the book (e.g., around 734s and 1176s). However, a disproportionate amount of time was spent on icebreakers (almost the first 7 minutes), which likely compromised the depth of the core content. The facilitator also read a large story themselves (around 1294s) rather than facilitating student discussion around it. Key discussions were not fully facilitated as per the protocol. |
| **3** | The group leader delivered the required content thoroughly. | **3** | The delivery of the core content felt rushed and superficial. The concept of neuroplasticity was defined, but the discussion was not deep. The facilitator primarily asked students to define terms or read passages, rather than exploring their personal experiences with the concepts thoroughly. The facilitator's prompt for growth stories (around 1480s) was good, but the follow-up discussions were brief and didn't explore the challenges and strategies in depth, with the facilitator doing most of the talking. |
| **4** | The group leader delivered the required content skillfully. | **5** | The facilitator's main strength is skillful delivery in terms of creating a warm and engaging atmosphere. The high \`pitch_diversity\` and energetic tone kept the session lively. They used self-disclosure effectively to model the growth mindset concept with a personal story about struggling with Physics (1392s). However, this skill in engagement did not translate to the skillful application of core therapeutic techniques like validation, juxtaposition, or connecting themes between students, which were significant misses. |
| **5** | The group leader delivered the required content clearly and accessibly. | **6** | The facilitator excelled at making the content clear and accessible. They broke down complex terms like 'neuroplasticity' into simple, relatable language ('your brain can grow and change if you want it to'). They used a mix of English and Swahili, which is appropriate for the context, and referenced culturally relevant figures (e.g., Mr. Beast, Obama) to illustrate points. The overall communication style was very age-appropriate and engaging for high school students. |
| **6** | The group leader did not add content from outside the protocol. | **7** | The facilitator did an excellent job of staying within protocol boundaries. There was no introduction of outside therapeutic content. The self-disclosure used was appropriate, directly relevant to the topic of 'Growth Mindset', and served as a model for the participants. They maintained a friendly but professional boundary throughout the session. |
|  | **Overall Score** | **4.7/7** | The session was characterized by high energy and strong rapport-building, but low adherence to the specific therapeutic techniques of the protocol. The facilitator is skilled at engagement but needs significant training on core counseling skills and protocol structure. |

---

## 2. Qualitative Feedback

### Overall Summary

This session focused on introducing the concept of Growth Mindset. The facilitator began with a series of lengthy icebreakers that successfully created a positive and energetic atmosphere. The core content on growth mindset and neuroplasticity was introduced through readings from the manual and facilitator-led explanations. The highlight of the session was a segment where students were prompted to share their own 'growth stories', leading to two powerful personal disclosures. While the facilitator demonstrated excellent rapport-building skills and used self-disclosure effectively, there was a noticeable lack of adherence to core protocol techniques such as validation, rephrasing, and connecting themes between students. The session felt more like an engaging psychoeducational lecture than a facilitated group therapy session.

### Strengths

1. Excellent rapport-building and creation of a positive, energetic environment. The high \`pitch_diversity\` reflects their engaging and expressive vocal tone.

2. Effective use of self-disclosure to model vulnerability and the concept of a growth mindset (e.g., sharing their personal struggles with Physics).

3. Made complex psychological concepts like neuroplasticity accessible and relatable to adolescents using simple language and modern examples (e.g., Duolingo, Mr. Beast).

4. Successfully encouraged participants to share personal and meaningful growth stories, creating moments of genuine connection.

### Weaknesses & Areas for Improvement

1. **Protocol Adherence:** The mandatory explanation of confidentiality was not delivered according to the protocol. It lacked the specific harm example and was not framed jovially.

2. **Time Management:** Too much time was spent on icebreakers, leaving insufficient time for a thorough exploration of the session's core topic.

3. **Use of Therapeutic Skills:** Key skills were underutilized. There were missed opportunities for **Validation** (e.g., after a student shared a story of being bullied), **Rephrasing** (summarizing student contributions in their own words), and **Connecting Between Students** (linking the two growth stories about self-acceptance).

### Session Flow and Engagement

The session's pacing was uneven, with a very long and interactive icebreaker period followed by a more rushed, lecture-style content delivery. The \`quick_exchange_ratio\` is high, likely driven by the fast-paced games at the beginning. Participant engagement was high during the icebreakers but became more passive during the content section, where students were often asked to read aloud or listen to the facilitator. The facilitator dominated the speaking time, especially during the latter half of the session. The 'growth story' segment was the most therapeutically potent part of the session.

---

## 3. Flags for Behavior

* **Other:** A student shared a past experience of struggling with body image, being called names ('kande, wewe ni sindano'), feeling like a 'misfit', and dealing with anger issues in primary school which included physical altercations ('ningeslap them or nilichapa'). (Severity: Low, Timestamp: toward the end of the session)

---

## 4. Recommendations

1. **Practice the Confidentiality Script:** Rehearse the exact wording for the confidentiality explanation, including the jovial tone and the mandatory 'setting the dorm on fire' example to ensure this critical element is covered correctly in future sessions.

2. **Structure Session Time:** Allocate a strict time limit (e.g., 5-7 minutes) for icebreakers to ensure that the majority of the session is dedicated to the core protocol content. This will allow for deeper exploration rather than a superficial overview.

3. **Focus on One Skill Per Session:** In supervision, focus on mastering one core skill at a time. For the next session, the goal could be to practice **Validation**. For every student contribution, the facilitator should practice responding with a validating statement like, 'Wow, that sounds really tough. It makes sense that you would feel that way.'

4. **Implement 'Connecting' Questions:** After one student shares, actively practice connecting them to the group by asking questions like: 'Thank you for sharing that. Has anyone else had a similar experience with feeling judged?' or 'That story about self-acceptance reminds me of what [other student] shared earlier. It seems like this is a common theme for many of you.'`
  }
];

export default function AIFeedbackPage() {
  const [selectedFile, setSelectedFile] = useState<MarkdownFile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleRowClick = (file: MarkdownFile) => {
    setSelectedFile(file);
    setIsDialogOpen(true);
  };


  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Feedback Analysis Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {markdownFiles.map((file) => (
                <TableRow
                  key={file.id}
                  className="cursor-pointer hover:bg-blue-bg"
                  onClick={() => handleRowClick(file)}
                >
                  <TableCell className="font-medium">{file.title}</TableCell>
                  <TableCell>{file.description}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(file);
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedFile?.title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 overflow-y-auto max-h-[calc(80vh-100px)] pr-4">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom styling for markdown elements
                  h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-bold mt-6 mb-3">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
                  p: ({ children }) => <p className="mb-2">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  hr: () => <hr className="my-4 border-shamiri-light-grey" />,
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full divide-y divide-shamiri-light-grey border border-shamiri-light-grey">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-blue-bg">{children}</thead>,
                  tbody: ({ children }) => <tbody className="divide-y divide-shamiri-light-grey bg-white">{children}</tbody>,
                  tr: ({ children }) => <tr className="hover:bg-gray-50">{children}</tr>,
                  th: ({ children }) => <th className="px-4 py-3 text-left text-xs font-medium text-shamiri-text-grey uppercase tracking-wider border-r border-shamiri-light-grey last:border-r-0">{children}</th>,
                  td: ({ children }) => <td className="px-4 py-3 text-sm border-r border-shamiri-light-grey last:border-r-0">{children}</td>,
                  code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                }}
              >
                {selectedFile?.content || ""}
              </ReactMarkdown>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
