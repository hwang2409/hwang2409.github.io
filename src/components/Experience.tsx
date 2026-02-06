export default function Experience() {
  const experiences = [
	{
		company: "Fish Audio",
		role: "Software Engineering Intern",
		duration: "Jan. 2026 - Present",
		description: "",
	},
    {
      company: "NationGraph",
      role: "Software Engineering Intern",
      duration: "May. 2025 - Aug. 2025",
      description: "Developed a ML pipeline for classifying & normalizing 600M+ vendor names.",
    },
    {
      company: "WATonomous",
      role: "Autonomous Software Developer",
      duration: "Sept. 2024 - Present",
      description: "Developing core autonomy software for a rover, improving navigation and real-time object detection capabilities.",
    },
  ];

  return (
    <section className="py-10">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-100 mb-6 ">
        experience
      </h2>
      <div className="space-y-8">
        {experiences.map((exp, index) => (
          <div key={index} className="border-l-2 border-neutral-800 pl-4">
            <h3 className="text-lg font-semibold text-neutral-100 mb-2">
              {exp.company}
            </h3>
            <p className="text-neutral-500 mb-2">
              {exp.role}
            </p>
            <p className="text-neutral-500 text-sm mb-3">
              {exp.duration}
            </p>
            <p className="text-neutral-300 leading-relaxed">
              {exp.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
