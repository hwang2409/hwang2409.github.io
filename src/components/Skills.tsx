export default function Skills() {
  const skills = [
    'C', 'C++', 'Python', 'Typescript', 'Java', 'React', 'Next.js', 'FastAPI', 'Django', 'ROS2', 'Docker', 'PostgreSQL', 'MongoDB', 'Redis', 'PyTorch', 'XGBoost', 'Tailwind CSS', 'Three.js', 'wasm'

  ];

  return (
    <section className="py-10">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-100 mb-6 ">
        Skills
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
