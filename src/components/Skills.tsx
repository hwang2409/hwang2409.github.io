export default function Skills() {
  const skills = [
    'c', 'c++', 'java', 'python', 'js', 'react', 'git', 'docker', 'pytorch', 'numpy', 'node.js', 'LLMs', 'NLPs'

  ];

  return (
    <section className="mb-4">
      <h2 className="text-2xl font-bold text-black mb-2 underline">
        skills
      </h2>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className="text-gray-400 text-sm"
          >
            {skill}
          </span>
        ))}
      </div>
    </section>
  );
}

