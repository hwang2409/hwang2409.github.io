export default function Education() {
  const education = [
    {
      institution: "University of Waterloo",
      degree: "Software Engineering (BSE)",
      duration: "2024 - 2029"
    },
  ];

  return (
    <section className="py-10">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-100 mb-6 ">
       Education 
      </h2>
      <div className="space-y-8">
        {education.map((edu, index) => (
          <div key={index} className="border-l-2 border-neutral-800 pl-4">
            <h3 className="text-lg font-semibold text-neutral-100 mb-2">
              {edu.institution}
            </h3>
            <p className="text-neutral-500 mb-2">
              {edu.degree}
            </p>
            <p className="text-neutral-500 text-sm">
              {edu.duration}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
