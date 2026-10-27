import type { SurveyForm } from "#/lib/survey/form";

/** Three pages mixing every kind of item, including a rating scale and a grid. */
export const PRINT_FORM: SurveyForm = {
  format: 1,
  pages: [
    {
      title: "About you",
      items: [
        { id: "h1", kind: "heading", text: "Student **wellbeing** survey", align: "center" },
        {
          id: "p1",
          kind: "paragraph",
          text: "Please answer **every** question.\nThere are no right or wrong answers.",
        },
        {
          id: "q_mood",
          kind: "single_choice",
          key: "mood",
          prompt: "How are you feeling today?",
          helpText: "0 is **very bad**, 4 is very good",
          required: true,
          options: ["0", "1", "2", "3", "4"].map((n) => ({ code: n, label: n })),
        },
        {
          id: "q_home",
          kind: "single_choice",
          key: "home",
          prompt: "Who do you live with?",
          required: true,
          options: [
            { code: "1", label: "Both parents" },
            { code: "2", label: "One parent" },
            { code: "3", label: "A relative or guardian who is not one of my parents" },
            {
              code: "4",
              label:
                "Somebody else, for example friends of the family, a children's home, or another place I would rather describe",
            },
          ],
        },
        {
          id: "q_sport",
          kind: "multiple_choice",
          key: "sport",
          prompt: "Which of these do you play?",
          required: false,
          options: [
            { code: "football", label: "Football" },
            { code: "netball", label: "Netball" },
            { code: "athletics", label: "Athletics" },
            { code: "none", label: "None of these" },
          ],
        },
        { id: "d1", kind: "divider" },
      ],
    },
    {
      title: "Over the last two weeks",
      items: [
        {
          id: "q_phq",
          kind: "grid",
          key: "phq",
          prompt: "Over the **last two weeks**, how often have you been bothered by:",
          required: true,
          options: [
            { code: "0", label: "Not at all" },
            { code: "1", label: "Several days" },
            { code: "2", label: "More than half the days" },
            { code: "3", label: "Nearly every day" },
          ],
          rows: [
            { key: "1", label: "Little interest or pleasure in doing things" },
            { key: "2", label: "Feeling down, depressed, or hopeless" },
            { key: "3", label: "Trouble falling or staying asleep, or sleeping too much" },
            { key: "4", label: "Feeling tired or having little energy" },
            { key: "5", label: "Poor appetite or overeating" },
          ],
        },
        {
          id: "q_age",
          kind: "number",
          key: "age",
          prompt: "How old are you?",
          required: true,
          digits: 3,
          min: 0,
          max: 120,
        },
        { id: "q_dob", kind: "date", key: "dob", prompt: "Date of birth", required: false },
      ],
    },
    {
      items: [
        { id: "h2", kind: "heading", text: "Anything else" },
        {
          id: "q_notes",
          kind: "text",
          key: "notes",
          prompt: "Is there anything else you would like to tell us?",
          required: false,
          lines: 3,
        },
        { id: "q_sign", kind: "signature", key: "sign", prompt: "Signature", required: true },
      ],
    },
  ],
};
