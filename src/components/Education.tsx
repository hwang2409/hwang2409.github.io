export default function Education() {
  const education = [
    {
      institution: "university of waterloo",
      degree: "bachelor's degree of software engineering (BSE)",
      duration: "2024 - 2029"
    },
    {
      institution: "richmond hill high School",
      degree: "ontario secondary school diploma (OSSD)",
      duration: "2022 - 2024"
    }
  ];

  return (
    <section className="mb-4">
      <h2 className="text-2xl font-bold text-black mb-2 underline">
        education
      </h2>
      <div className="space-y-6">
        {education.map((edu, index) => (
          <div key={index} className="border-l-2 border-gray-600 pl-4">
            <h3 className="text-lg font-bold text-black mb-2">
              {edu.institution}
            </h3>
            <p className="text-gray-400 mb-2">
              {edu.degree}
            </p>
            <p className="text-gray-400 text-sm">
              {edu.duration}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

