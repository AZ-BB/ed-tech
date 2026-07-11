/** English display labels for program fit test quiz (form values stay as stable codes). */
export const programFitTestOptionsEn = {
  steps: {
    interests: {
      label: "Interests",
      title: "What naturally interests you?",
      intro:
        "Let's start with what pulls your attention naturally — the topics you enjoy reading about, watching, or discussing.",
      questions: {
        topics: {
          prompt: "When you have free time, which topics are you most likely to explore?",
          hint: "Choose up to 3.",
          options: {
            tech: "Technology, apps, AI, or coding",
            business: "Business, money, startups, or investing",
            health: "Health, medicine, psychology, or wellbeing",
            creative: "Design, fashion, film, media, or creativity",
            social: "Politics, society, law, or global issues",
            eng: "Engineering, machines, buildings, or how things work",
            env: "Environment, climate, sustainability, or energy",
            edu: "Education, helping others, or community work",
          },
        },
        subjects: {
          prompt: "Which school subjects do you usually enjoy most?",
          hint: "Choose up to 3.",
          options: {
            math: "Mathematics",
            phys: "Physics",
            bio: "Biology",
            chem: "Chemistry",
            econ: "Economics / Business",
            psy: "Psychology / Sociology",
            eng: "English / Writing",
            art: "Art / Design / Media",
            cs: "Computer Science",
            hist: "History / Politics",
          },
        },
      },
    },
    thinkingStyle: {
      label: "Thinking style",
      title: "How do you like to solve problems?",
      intro:
        "Different programs reward different ways of thinking. This helps us understand how your mind works best.",
      questions: {
        approach: {
          prompt: "When facing a difficult problem, what do you naturally do first?",
          options: {
            logic: "Break it into logical steps",
            patterns: "Look for patterns in data or numbers",
            discuss: "Talk it through with people",
            visualize: "Sketch, visualise, or prototype an idea",
            research: "Research deeply before deciding",
            empathy: "Think about who is affected and why it matters",
          },
        },
        challenge: {
          prompt: "Which type of challenge sounds most satisfying?",
          options: {
            logic: "Solving a complex math or logic puzzle",
            build: "Building an app, tool, or system",
            help: "Helping someone understand themselves or solve a personal issue",
            design: "Designing something beautiful or useful",
            business: "Making a business decision with limited information",
            social: "Improving a community, policy, or social problem",
          },
        },
      },
    },
    environment: {
      label: "Environment",
      title: "What kind of work environment fits you?",
      intro:
        "Your future career environment matters. Some students thrive in fast-paced settings, others prefer structure, creativity, or people-focused work.",
      questions: {
        environment: {
          prompt: "Which environment sounds most appealing?",
          options: {
            corporate: "Fast-paced office with ambitious people and deadlines",
            health: "Hospital, clinic, lab, or health-related environment",
            tech: "Tech company, startup, or product team",
            creative: "Design studio, media team, or creative workspace",
            community: "School, community, NGO, or public service setting",
            engineer: "Engineering site, lab, workshop, or technical project environment",
            research: "Research, policy, or strategy environment",
          },
        },
        pressure: {
          prompt: "How much pressure are you comfortable with?",
          leftLabel: "I prefer calm, predictable work",
          rightLabel: "I am comfortable with high pressure",
        },
        focus: {
          prompt: "Do you prefer working mostly with people, systems, or ideas?",
          options: {
            people: "Mostly with people",
            systems: "Mostly with systems / tools / data",
            ideas: "Mostly with ideas / research",
            mix: "A balanced mix",
          },
        },
      },
    },
    motivation: {
      label: "Motivation",
      title: "What motivates you most?",
      intro:
        "Motivation matters because some degrees are long, competitive, or highly technical. Knowing what drives you helps us recommend better options.",
      questions: {
        matters: {
          prompt: "What matters most to you when thinking about your future?",
          hint: "Choose up to 2.",
          options: {
            income: "High earning potential",
            stability: "Job stability",
            helping: "Helping people directly",
            impact: "Solving important global or regional problems",
            creative: "Creative freedom",
            building: "Building a business or product",
            prestige: "Prestige or recognition",
            flexible: "Flexibility and work-life balance",
          },
        },
        priority: {
          prompt: "If you had to choose one, which would you prioritise?",
          options: {
            income: "Income and career growth",
            meaning: "Meaning and impact",
            creativity: "Creativity and self-expression",
            stability: "Stability and security",
            intellect: "Intellectual challenge",
            independence: "Independence and flexibility",
          },
        },
      },
    },
    strengths: {
      label: "Strengths",
      title: "What are your strengths?",
      intro:
        "Be honest here. You don't need to be good at everything. The goal is to identify where you are naturally stronger.",
      questions: {
        strengths: {
          prompt: "Which of these feel most like you?",
          hint: "Choose up to 4.",
          options: {
            numbers: "I am good with numbers",
            explain: "I explain things clearly",
            detail: "I notice details others miss",
            empathy: "I understand people's emotions",
            creative: "I am creative and visual",
            organize: "I like organising plans and tasks",
            research: "I enjoy researching deeply",
            pressure: "I can stay calm under pressure",
            build: "I like building or fixing things",
            debate: "I enjoy debating and making arguments",
            tech: "I am comfortable with technology",
            social: "I care about social or environmental issues",
          },
        },
        improve: {
          prompt: "Which skill would you most want to improve over the next few years?",
          options: {
            comm: "Communication and confidence",
            tech: "Technical / coding skills",
            analytic: "Analytical and quantitative skills",
            creative: "Creativity and design",
            leader: "Leadership and teamwork",
            research: "Research and writing",
            business: "Business and financial thinking",
          },
        },
      },
    },
    studyStyle: {
      label: "Study style",
      title: "What kind of university experience do you want?",
      intro:
        "Some programs are lecture-heavy, some are project-heavy, some require labs, studios, internships, or long professional training.",
      questions: {
        learning: {
          prompt: "What kind of learning style do you prefer?",
          options: {
            theory: "Lectures, reading, and exams",
            project: "Projects, presentations, and teamwork",
            lab: "Labs, experiments, and practical work",
            studio: "Studio work, portfolios, and creative projects",
            case: "Case studies, business problems, and discussions",
            field: "Fieldwork, community work, or real-world experience",
          },
        },
        duration: {
          prompt: "How do you feel about a long study path?",
          options: {
            long: "I am open to a long path if the career is worth it",
            standard: "I prefer a standard 3–4 year degree",
            practical: "I want something practical that leads to work quickly",
            unsure: "I am not sure yet",
          },
        },
        breadth: {
          prompt: "Would you rather specialise deeply or keep your options broad?",
          options: {
            specialize: "Specialise deeply in one field",
            broad: "Keep options broad and flexible",
            hybrid: "Start broad, then specialise later",
          },
        },
      },
    },
    futureVision: {
      label: "Future vision",
      title: "What future feels exciting?",
      intro:
        "Imagine yourself 10 years from now. Which version of your future feels most exciting or meaningful?",
      questions: {
        future: {
          prompt: "Which future sounds most like something you would be proud of?",
          options: {
            business: "Leading financial or business decisions",
            tech: "Designing technology used by thousands or millions of people",
            health: "Treating patients or improving health outcomes",
            creative: "Building beautiful spaces, products, stories, or brands",
            mentor: "Advising people, teaching, mentoring, or supporting communities",
            impact: "Working on climate, sustainability, public policy, or social impact",
            law: "Working in law, diplomacy, government, or international affairs",
            founder: "Building my own startup or business",
          },
        },
        identity: {
          prompt: "What type of career identity appeals to you most?",
          options: {
            analyst: "Analyst / strategist",
            engineer: "Builder / engineer",
            doctor: "Doctor / healthcare professional",
            designer: "Designer / creator",
            advisor: "Advisor / mentor",
            researcher: "Researcher / expert",
            leader: "Leader / entrepreneur",
            advocate: "Advocate / policymaker",
          },
        },
      },
    },
    preferences: {
      label: "Preferences",
      title: "Final preferences",
      intro: "Last step. These answers help us shape recommendations around your practical preferences.",
      questions: {
        regions: {
          prompt: "Which regions are you most interested in for university?",
          hint: "Choose up to 3.",
          options: {
            gcc: "UAE / GCC",
            uk: "United Kingdom",
            us: "United States",
            canada: "Canada",
            europe: "Europe",
            aus: "Australia",
            unsure: "Not sure yet",
          },
        },
        salaryWeight: {
          prompt: "How important is strong salary potential?",
          leftLabel: "Not very important",
          rightLabel: "Very important",
        },
        enjoyWeight: {
          prompt: "How important is personal interest and enjoyment?",
          leftLabel: "Not very important",
          rightLabel: "Very important",
        },
      },
    },
  },
  careerSignals: {
    "high-demand": "High demand",
    growing: "Growing field",
    "high-salary": "Strong salary",
  },
} as const;
