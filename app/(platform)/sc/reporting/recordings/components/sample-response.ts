export const SAMPLE_FEEDBACK = {
  fidelity_scores: {
    question_1_protocol_adherence: {
      score: 2,
      justification:
        "Adherence was low due to the omission of several mandatory protocol elements. Most critically, the 'Explaining Confidentiality' component was not performed at the beginning of the session; it was only vaguely mentioned at the very end without the required jovial tone or specific example of when it would be broken. Additionally, the mandatory techniques of 'Rephrasing' and the 3-step 'Reflecting' process at the end of the session were completely absent.",
    },
    question_2_content_specifications: {
      score: 4,
      justification:
        "The facilitator covered the main content topics for the session (values, role models, goal setting) and guided students through the corresponding workbook activities. However, the delivery lacked adherence to specifications around *how* the content should be facilitated. The absence of techniques like rephrasing and structured reflection means that while the 'what' was covered, the 'how' was not, leading to a neutral score.",
    },
    question_3_thoroughness: {
      score: 4,
      justification:
        "The session's thoroughness was mixed. The facilitator allocated significant time for individual workbook activities, evidenced by long periods of silence, which allowed for personal reflection. However, the group discussions felt superficial at times, moving from one student to the next without deeper exploration. The session conclusion was particularly rushed and chaotic, lacking a thorough summary or reflection on the day's topic.",
    },
    question_4_skillful_delivery: {
      score: 5,
      justification:
        "The facilitator demonstrated skill in several key areas. They effectively used open-ended questions, verbal nodding (frequent 'Mhm'), and connecting themes between students (e.g., identifying that many role models were 'hard working'). The response to a student's disclosure of a bereavement was empathetic and appropriate. However, the lack of other critical skills (rephrasing, structured reflection) and the disorganized session ending prevent a higher score.",
    },
    question_5_clarity_accessibility: {
      score: 6,
      justification:
        "The facilitator excelled at making the core concepts clear and accessible. They broke down the abstract idea of 'values' into simple, relatable terms using everyday examples (e.g., 'good characteristics that a person lives by... like if you value kindness'). Instructions for the workbook activities were also clear and repeated for understanding. The language used was age-appropriate and culturally relevant.",
    },
    question_6_protocol_boundaries: {
      score: 7,
      justification:
        "The facilitator maintained excellent protocol boundaries. They did not add any content from outside the specified curriculum. The use of a personal example of a role model was appropriate as it served to model the activity for the students and was not an over-disclosure. The session remained focused on the intended material.",
    },
    overall_score: "4.7",
    overall_assessment:
      "Moderate fidelity with critical gaps. The facilitator demonstrated foundational skills in creating a safe space and explaining concepts but failed to adhere to several mandatory protocol techniques, most notably the initial confidentiality agreement and the structured session wrap-up. This significantly impacts overall protocol fidelity.",
  },
  qualitative_feedback: {
    session_summary:
      "This session focused on the topic of 'Values'. The facilitator began with a general check-in, during which a student disclosed a recent bereavement. The facilitator and a co-facilitator handled this with empathy and offered follow-up support. The core of the session involved introducing the concept of values, having students identify their own from a workbook, and facilitating a discussion about role models. The session concluded with an individual goal-setting activity. While the main content points were covered, the session suffered from a lack of adherence to specific procedural elements of the protocol, such as rephrasing and a structured reflection, and concluded in a disorganized manner.",
    strengths: [
      "Effective use of open-ended questions to elicit student experiences (e.g., 'How have you guys been?', 'Who else would like to share their role model?').",
      "Consistent use of verbal nodding ('Mhm', 'Yeah') to demonstrate active listening and encourage students to continue speaking.",
      "Successfully connected themes between students to build a sense of shared experience, such as noting the common value of 'hard working' role models and that many chose family members.",
      "Handled a sensitive student disclosure about a bereavement with appropriate empathy and a clear, supportive offer of follow-up with a supervisor.",
      "Good use of silence as a therapeutic tool, allowing students ample quiet time for individual reflection and writing in their workbooks.",
    ],
    areas_for_improvement: [
      "**Confidentiality Explanation**: This is a non-negotiable, mandatory element that must be delivered at the start of every session. The facilitator must explain the rules of confidentiality, including the specific safety exception, using a jovial tone and an example as prescribed.",
      "**Rephrasing Technique**: The facilitator did not use rephrasing to summarize student contributions. They should practice listening for key phrases and repeating them back to the student and group to confirm understanding and highlight important points (e.g., 'So it sounds like you admire your sister because she is focused and hardworking.').",
      "**Structured Reflection**: The session ended abruptly and chaotically. The facilitator must practice the mandatory 3-step reflection process: 1) Summarize the lesson (values and goals), 2) Mention specific student contributions (e.g., 'Student A shared about their parent's kindness, and Student B talked about their sibling's hard work'), and 3) Make a clear transition to the end of the session.",
    ],
    session_flow_and_engagement:
      "The session's flow was inconsistent. The facilitator effectively guided the group through the structured activities, but the transitions between discussion and individual work were sometimes abrupt. Engagement was moderate; while most students participated when called upon, there were long silences that suggested hesitation, requiring frequent prompting from the facilitator. The flow completely broke down in the final five minutes, becoming a series of fragmented and overlapping conversations.",
  },
  safety_flags: [
    {
      type: "other",
      description:
        "A student disclosed a recent death of someone close to them, indicating they were struggling to cope. A co-facilitator followed up, asking if it was affecting them at school, and the student's response indicated ongoing distress.",
      timestamp_reference: "early in session, around the 9-minute mark",
      severity: "medium",
      immediate_action_needed: false,
      context_analysis:
        "This was a disclosure of a current issue causing ongoing emotional distress. The student shared this during the initial check-in. The co-facilitator's response was appropriate: they validated the student's feelings and immediately offered a follow-up with a supervisor. This action correctly addresses the need for support while allowing the group session to continue. The action was handled correctly in the moment, so no further immediate action is needed beyond ensuring the promised follow-up occurs.",
      current_vs_past: "current",
      confidence_level: "high",
      requires_follow_up: true,
    },
  ],
  recommendations: [
    "**Mandatory Protocol Review**: The facilitator must review and role-play the mandatory protocol elements, especially the 'Explaining Confidentiality' script, to ensure it is delivered correctly at the start of the next session.",
    "**Practice Rephrasing**: In supervision, the facilitator should practice rephrasing statements. A supervisor could provide sample student statements, and the facilitator can practice summarizing them using the student's exact key words.",
    "**Create a Closing 'Cheat Sheet'**: The facilitator should write down the 3 steps of the reflection process on a notecard to use at the end of the session. This will help them structure the closing and ensure they remember to summarize the topic and incorporate specific student examples before concluding.",
  ],
};
