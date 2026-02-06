export default function Skills() {
  const skills = [
    'c', 'c++', 'python', 'typescript', 'java', 'react', 'next.js', 'fastapi', 'django', 'ros2', 'docker', 'postgresql', 'mongodb', 'redis', 'pytorch', 'xgboost', 'tailwind css', 'three.js', 'webassembly'

  ];

  return (
    <section className="py-10">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-100 mb-6 ">
        skills
      </h2>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className="text-neutral-500 text-sm border border-neutral-800 rounded-full px-3 py-1"
          >
            {skill}
          </span>
        ))}
      </div>
    </section>
  );
}
