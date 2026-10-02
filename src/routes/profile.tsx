import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  FileUp,
  Loader2,
  Plus,
  RefreshCw,
  Sparkle,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { extractResumeText } from "@/lib/edupath.functions";
import { resetAll, setProfile, useEduPath } from "@/lib/edupath-store";
import { emptyProfile, type LearnerProfile, type SkillEntry } from "@/lib/edupath-types";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "EduPath — Build your personalized learning path" },
      {
        name: "description",
        content:
          "Tell EduPath your skills, experience and target career. The AI agent analyzes your capability, finds your gaps and builds an adaptive roadmap.",
      },
      { property: "og:title", content: "EduPath — Build your personalized learning path" },
      {
        property: "og:description",
        content:
          "AI skill analysis, gap detection and an adaptive learning roadmap for your target career.",
      },
    ],
  }),
  component: ProfilePage,
});



const MAJOR_SKILLS = [
  // Computing & IT
  "Python", "Java", "JavaScript", "TypeScript", "C", "C++", "C#", "Go", "Rust", "Kotlin", "Swift", "PHP", "Ruby",
  "HTML", "CSS", "SQL", "NoSQL", "Git", "GitHub", "Linux", "Docker", "Kubernetes", "AWS", "Azure", "Google Cloud",
  "React", "Angular", "Vue.js", "Next.js", "Node.js", "Express.js", "Django", "Flask", "Spring Boot", ".NET", "Flutter", "React Native",
  "Data Structures", "Algorithms", "Problem Solving", "Database Management", "API Development", "REST API", "GraphQL", "Web Development", "Mobile App Development",
  "Machine Learning", "Deep Learning", "Artificial Intelligence", "Generative AI", "Natural Language Processing", "Computer Vision", "Data Science", "Data Analysis", "Statistics", "Pandas", "NumPy", "PyTorch", "TensorFlow", "Power BI", "Tableau", "Excel",
  "Cybersecurity", "Ethical Hacking", "Network Security", "Cloud Computing", "DevOps", "Software Testing", "QA Testing", "Automation Testing", "UI/UX Design", "Figma", "Product Design", "Prompt Engineering",

  // Agriculture & environment
  "Agriculture", "Agronomy", "Horticulture", "Floriculture", "Forestry", "Organic Farming", "Precision Agriculture", "Smart Farming", "AgriTech", "Crop Management", "Soil Science", "Plant Science", "Animal Husbandry", "Dairy Farming", "Poultry Farming", "Fisheries", "Food Science", "Food Technology", "Environmental Science", "Environmental Management", "Sustainable Development", "Climate Studies",

  // Cooking & culinary
  "Cooking", "Baking", "Grilling", "Roasting", "Frying", "Steaming", "Boiling", "Sautéing", "Food Preparation", "Meal Preparation", "Indian Cuisine", "South Indian Cuisine", "North Indian Cuisine", "International Cuisine", "Pastry Making", "Cake Decoration", "Food Styling", "Catering", "Kitchen Management", "Nutrition Basics", "Food Safety",

  // Electronics & electrical
  "Electronics", "Electrical Engineering", "Circuit Design", "Digital Electronics", "Analog Electronics", "Embedded Systems", "Microcontrollers", "Arduino", "Raspberry Pi", "IoT", "Robotics", "PCB Design", "VLSI", "FPGA", "Power Electronics", "Control Systems", "Instrumentation", "MATLAB", "Simulink", "Electrical Wiring", "AutoCAD Electrical",

  // Mechanical & manufacturing
  "Mechanical Engineering", "CAD", "AutoCAD", "SolidWorks", "CATIA", "Creo", "Fusion 360", "3D Modeling", "3D Printing", "CNC Machining", "Manufacturing", "Production Engineering", "Industrial Engineering", "Thermodynamics", "Fluid Mechanics", "Machine Design", "Engineering Drawing", "Mechatronics", "Automotive Engineering", "Maintenance Engineering", "Quality Control", "Six Sigma", "Lean Manufacturing",

  // Civil, architecture & design
  "Civil Engineering", "Structural Engineering", "Construction Management", "Surveying", "Building Design", "Architecture", "Interior Design", "Urban Planning", "AutoCAD Civil", "Revit", "BIM", "SketchUp", "3D Rendering", "Quantity Surveying", "Project Management",

  // Communication, language & literature
  "Communication", "English Communication", "Spoken English", "English Grammar", "Public Speaking", "Presentation Skills", "Business Communication", "Technical Writing", "Creative Writing", "Content Writing", "Copywriting", "Blogging", "Storytelling", "Journalism", "Editing", "Proofreading", "Translation", "Literature", "English Literature", "Tamil Literature", "Poetry", "Research Writing", "Debate", "Interview Skills",

  // Arts, music, dance & creative skills
  "Drawing", "Sketching", "Painting", "Watercolor Painting", "Acrylic Painting", "Oil Painting", "Digital Art", "Illustration", "Graphic Design", "Craft Work", "Handicrafts", "Calligraphy", "Photography", "Videography", "Video Editing", "Animation", "3D Animation", "Music", "Singing", "Instrumental Music", "Guitar", "Piano", "Keyboard", "Drums", "Dancing", "Classical Dance", "Bharatanatyam", "Contemporary Dance", "Western Dance", "Choreography", "Theatre", "Acting",

  // Business, commerce & professional skills
  "Business Management", "Entrepreneurship", "Marketing", "Digital Marketing", "Sales", "Customer Service", "Human Resources", "Recruitment", "Finance", "Accounting", "Bookkeeping", "Banking", "Economics", "Business Analysis", "Project Management", "Operations Management", "Supply Chain Management", "Logistics", "Retail Management", "Leadership", "Team Management", "Time Management", "Event Management", "Negotiation",

  // Science, education & research
  "Physics", "Chemistry", "Biology", "Mathematics", "Applied Mathematics", "Biotechnology", "Microbiology", "Biochemistry", "Geology", "Astronomy", "Research", "Laboratory Skills", "Teaching", "Tutoring", "Curriculum Development", "Educational Technology", "Academic Research",

  // Common extracurricular & personal skills
  "Communication", "Leadership", "Teamwork", "Collaboration", "Critical Thinking", "Creative Thinking", "Problem Solving", "Decision Making", "Adaptability", "Time Management", "Organization", "Event Planning", "Volunteering", "Social Service", "Sports", "Fitness", "Yoga", "Public Relations", "Anchoring", "Emceeing", "NSS", "NCC"
];

const ROLE_SUGGESTIONS = [
  // Computing & IT
  "Computer Science Student", "Information Technology Student", "Software Developer", "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "Web Developer", "Mobile App Developer", "Python Developer", "Java Developer", "JavaScript Developer", "React Developer", "Node.js Developer", "Data Analyst", "Data Scientist", "Machine Learning Engineer", "AI Engineer", "Generative AI Engineer", "NLP Engineer", "Computer Vision Engineer", "Cloud Engineer", "DevOps Engineer", "Cybersecurity Analyst", "Cybersecurity Engineer", "Network Engineer", "Database Administrator", "Database Developer", "QA Engineer", "Software Tester", "Automation Test Engineer", "UI/UX Designer", "Product Designer", "Product Manager", "Business Analyst", "Technical Support Engineer", "System Administrator", "Solutions Architect", "Data Engineer", "MLOps Engineer", "Research Scientist",

  // Agriculture & food
  "Agriculture Student", "Agricultural Engineer", "Agronomist", "Horticulturist", "Agriculture Officer", "Agriculture Consultant", "Farm Manager", "AgriTech Professional", "Precision Agriculture Specialist", "Food Technologist", "Food Scientist", "Chef", "Commis Chef", "Pastry Chef", "Baker", "Cake Designer", "Culinary Professional", "Catering Manager", "Nutritionist",

  // Engineering
  "Mechanical Engineering Student", "Mechanical Engineer", "Design Engineer", "CAD Engineer", "Manufacturing Engineer", "Production Engineer", "Automotive Engineer", "Mechatronics Engineer", "Maintenance Engineer", "Quality Engineer", "Industrial Engineer", "Electrical Engineering Student", "Electrical Engineer", "Electronics Engineer", "Embedded Systems Engineer", "VLSI Engineer", "PCB Design Engineer", "Control Systems Engineer", "Instrumentation Engineer", "IoT Engineer", "Robotics Engineer", "Civil Engineering Student", "Civil Engineer", "Structural Engineer", "Site Engineer", "Construction Manager", "Quantity Surveyor", "Architect", "Interior Designer",

  // Communication, language & humanities
  "English Student", "English Teacher", "English Trainer", "Communication Trainer", "Content Writer", "Technical Writer", "Copywriter", "Editor", "Proofreader", "Journalist", "Translator", "Interpreter", "Author", "Writer", "Poet", "Literature Student", "Research Scholar", "Teacher", "Tutor", "Lecturer", "Professor", "Education Consultant",

  // Creative fields
  "Graphic Designer", "Illustrator", "Artist", "Painter", "Sketch Artist", "Digital Artist", "Animator", "3D Artist", "Photographer", "Videographer", "Video Editor", "Creative Director", "Fashion Designer", "Craft Artist", "Calligrapher", "Musician", "Singer", "Music Teacher", "Dancer", "Dance Teacher", "Choreographer", "Actor", "Theatre Artist", "Performing Artist",

  // Business & professional
  "Business Student", "Commerce Student", "MBA Student", "Entrepreneur", "Business Manager", "Marketing Executive", "Digital Marketing Specialist", "Sales Executive", "HR Executive", "Recruiter", "Accountant", "Financial Analyst", "Banking Professional", "Operations Manager", "Supply Chain Analyst", "Logistics Coordinator", "Project Manager", "Event Manager", "Customer Success Executive", "Public Relations Executive", "Management Consultant",

  // Science & research
  "Physics Student", "Chemistry Student", "Biology Student", "Mathematics Student", "Biotechnology Student", "Biotechnologist", "Microbiologist", "Biochemist", "Environmental Scientist", "Environmental Consultant", "Research Assistant", "Research Scientist", "Lab Technician", "Scientist",

  // Other education / general
  "School Student", "College Student", "University Student", "Diploma Student", "Vocational Student", "Final-year Student", "Graduate", "Postgraduate Student", "Freelancer", "Career Switcher", "Job Seeker", "Other"
];

function AutocompleteField({
  value,
  onChange,
  placeholder,
  allowOther = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  allowOther?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const suggestions = useMemo(() => {
    if (customMode) return [];
    const q = value.trim().toLowerCase();
    if (!q) return ROLE_SUGGESTIONS.filter((item) => item !== "Other").slice(0, 8);
    const matches = ROLE_SUGGESTIONS.filter((item) => item !== "Other" && item.toLowerCase().includes(q));
    return Array.from(new Set(matches)).slice(0, 8);
  }, [value, customMode]);

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder={customMode ? "Type your own option" : placeholder}
        autoComplete="off"
      />
      {open && (suggestions.length > 0 || (allowOther && !customMode)) && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(item);
                setCustomMode(false);
                setOpen(false);
              }}
            >
              {item}
            </button>
          ))}
          {allowOther && !customMode && (
            <button
              type="button"
              className="block w-full rounded-lg border-t border-border px-3 py-2 text-left text-sm font-medium text-primary hover:bg-secondary"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setCustomMode(true);
                onChange("");
                setOpen(false);
              }}
            >
              Other — type your own
            </button>
          )}
        </div>
      )}
    </div>
  );
}


function ProfilePage() {
  const navigate = useNavigate();
  const { profile, analysis } = useEduPath();
  const parseResume = useServerFn(extractResumeText);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<LearnerProfile>(profile ?? emptyProfile);
  const [skillDraft, setSkillDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const skillSuggestions = useMemo(() => {
    const q = skillDraft.trim().toLowerCase();
    if (!q) return [];
    return MAJOR_SKILLS.filter((skill) => skill.toLowerCase().startsWith(q) && !form.skills.some((s) => s.name.toLowerCase() === skill.toLowerCase())).slice(0, 6);
  }, [skillDraft, form.skills]);


  const update = <K extends keyof LearnerProfile>(key: K, value: LearnerProfile[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addSkill = () => {
    const name = skillDraft.trim();
    if (!name) return;
    if (form.skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setSkillDraft("");
      return;
    }
    update("skills", [...form.skills, { name, level: 3 }]);
    setSkillDraft("");
  };

  const updateSkill = (index: number, patch: Partial<SkillEntry>) =>
    update(
      "skills",
      form.skills.map((skill, i) => (i === index ? { ...skill, ...patch } : skill)),
    );

  const onFile = async (file: File) => {
    setParsing(true);
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      buffer.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      const result = await parseResume({
        data: { fileName: file.name, base64: btoa(binary) },
      });
      if (!result.text) {
        toast.error("No readable text found in that file.");
      } else {
        update("resumeText", result.text);
        toast.success(`Loaded ${file.name}`);
      }
    } catch {
      toast.error("Could not read that file. Try pasting the text instead.");
    } finally {
      setParsing(false);
    }
  };

  const submit = async () => {
    if (!form.goalRole.trim()) {
      toast.error("Add the career or role you're aiming for.");
      return;
    }
    setLoading(true);
    // Submitting a profile is the explicit save/re-analyze action.
    // This clears any previous analysis so Gemini must run against the new input.
    setProfile(form);
    // The Agent page owns the Gemini workflow so the user immediately sees
    // the agentic stages instead of waiting on this form page.
    navigate({ to: "/agent" });
    setLoading(false);
  };

  return (
    <AppShell>
      <section className="mb-8 surface overflow-hidden p-6 sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkle className="size-3.5" /> Agentic learning platform
        </span>
        <h1 className="mt-4 text-4xl font-bold leading-[1.05] sm:text-5xl">
          <span className="text-gradient">Close the gap</span>
          <br />
          between where you are and the role you want.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          EduPath profiles your capability, detects the skills standing between you and your target career, and keeps rewriting your roadmap as you progress.
        </p>
      </section>

      <section id="learner-profile" className="scroll-mt-24 surface p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Learner profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The more honest the detail, the sharper the gap analysis.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Your name">
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Alex Doe"
            />
          </Field>
          <Field label="Current role or studies">
            <AutocompleteField
              value={form.currentRole}
              onChange={(value) => update("currentRole", value)}
              placeholder="Type your current role or studies"
              allowOther
            />
          </Field>
          <Field label="Target career or role">
            <AutocompleteField
              value={form.goalRole}
              onChange={(value) => update("goalRole", value)}
              placeholder="Type your target career or role"
              allowOther
            />
          </Field>
          <Field label="Years of experience">
            <Select value={String(form.experienceYears)} onValueChange={(value) => update("experienceYears", Number(value))}>
              <SelectTrigger><SelectValue placeholder="Select years" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, year) => (
                  <SelectItem key={year} value={String(year)}>{year} {year === 1 ? "year" : "years"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Timeline (months)">
            <Input
              type="number"
              min={1}
              value={form.timelineMonths}
              onChange={(e) => update("timelineMonths", Number(e.target.value) || 1)}
            />
          </Field>
          <Field label="Study hours per week">
            <Input
              type="number"
              min={1}
              value={form.hoursPerWeek}
              onChange={(e) => update("hoursPerWeek", Number(e.target.value) || 1)}
            />
          </Field>
        </div>

        <div className="mt-6">
          <Label className="text-sm">Current skills</Label>
          <div className="relative mt-2 flex gap-2">
            <div className="min-w-0 flex-1">
              <Input
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Type a skill, e.g. P"
                autoComplete="off"
              />
              {skillSuggestions.length > 0 && (
                <div className="absolute left-0 right-[76px] top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  {skillSuggestions.map((skill) => (
                    <button key={skill} type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary" onMouseDown={(e) => e.preventDefault()} onClick={() => { update("skills", [...form.skills, { name: skill, level: 3 }]); setSkillDraft(""); }}>
                      {skill}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="button" variant="secondary" onClick={addSkill}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
          <div className="mt-3 grid gap-2">
            {form.skills.map((skill, index) => (
              <div
                key={skill.name}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2"
              >
                <span className="min-w-32 flex-1 text-sm">{skill.name}</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={skill.level}
                  onChange={(e) => updateSkill(index, { level: Number(e.target.value) })}
                  className="h-1 w-40 accent-[var(--color-primary)]"
                />
                <span className="w-16 text-right text-xs text-muted-foreground">
                  {skill.level}/5
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    update(
                      "skills",
                      form.skills.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {form.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills added yet.</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Goals, interests and constraints">
            <Textarea
              rows={6}
              value={form.interests}
              onChange={(e) => update("interests", e.target.value)}
              placeholder="I want to work on computer vision, prefer hands-on projects, and can't study on weekdays before 7pm."
            />
          </Field>
          <Field label="Resume (optional)">
            <Textarea
              rows={6}
              value={form.resumeText}
              onChange={(e) => update("resumeText", e.target.value)}
              placeholder="Paste your resume or a background summary here…"
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.md"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onFile(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={parsing}
                onClick={() => fileRef.current?.click()}
              >
                {parsing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileUp className="size-4" />
                )}
                Upload PDF or text
              </Button>
              <span className="text-xs text-muted-foreground">or paste above</span>
            </div>
          </Field>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button size="lg" disabled={loading} onClick={submit}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Analyzing your profile…
              </>
            ) : (
              <>
                {analysis ? <RefreshCw className="size-4" /> : <Sparkle className="size-4" />}
                {analysis ? "Re-analyze and rebuild path" : "Analyze & build my path"}
              </>
            )}
          </Button>
          {analysis ? (
            <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>
              Go to dashboard
            </Button>
          ) : null}
          {(profile || analysis) ? (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => {
                if (!window.confirm("Clear your saved EduPath profile, roadmap and progress?")) return;
                resetAll();
                setForm(emptyProfile);
                toast.success("Saved EduPath data cleared.");
              }}
            >
              Reset saved data
            </Button>
          ) : null}
          {loading ? (
            <span className="text-sm text-muted-foreground">
              This takes up to a minute — the agent is reasoning about your gaps.
            </span>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
