export default function Experience() {
  const experiences = [
    {
      company: "nationgraph",
      role: "software engineering intern",
      duration: "May. 2025 - Aug. 2025",
      description: "developed a ML pipeline for classifying & normalizing 600M+ vendor names.",
    },
    {
      company: "watonomous",
      role: "autonomous software developer",
      duration: "Sept. 2024 - Present",
      description: "developing core autonomy software for a rover, improving navigation and real-time object detection capabilities.",
    },
    {
      company: "mathnasium",
      role: "tutor",
      duration: "Oct. 2022 - Apr. 2023",
      description: "planned tailored lessons and managed 8-10 students, grades 1-10, simultaneously.",
    },
    {
      company: "tt math school",
      role: "teaching assistant",
      duration: "Sept. 2022 - Mar. 2024",
      description: "supervised team of 4 teaching assistants, managing 120+ students.",
    },
  ];

  return (
    <section className="mb-4">
      <h2 className="text-2xl font-bold text-black mb-2 underline">
        experience
      </h2>
      <div className="space-y-6">
        {experiences.map((exp, index) => (
          <div key={index} className="border-l-2 border-gray-600 pl-4">
            <h3 className="text-lg font-bold text-black mb-2">
              {exp.company}
            </h3>
            <p className="text-gray-400 mb-2">
              {exp.role}
            </p>
            <p className="text-gray-400 text-sm mb-3">
              {exp.duration}
            </p>
            <p className="text-black leading-relaxed">
              {exp.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

