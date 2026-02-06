export default function Projects() {
  const projects = [
    {
      title: "NFL Predict System",
      date: "2025",
      description: "ML system predicting NFL game outcomes at 89% accuracy.",
      technologies: ["python", "xgboost", "fastapi", "next.js", "postgresql", "redis", "docker"],
      link: "https://github.com/hwang2409/nfl"
    },
    {
      title: "hang.ai",
      date: "Sep. 2025 - Present",
      description: "Highly efficient ML-powered study platform.",
      technologies: ["fastapi", "react", "kong", "postgresql", "redis", "rabbitmq", "celery"],
      link: "http://hangai-six.vercel.app"
    },
    {
      title: "whitematter: Build your own custom models",
      date: "Aug. 2024 - Nov. 2024",
      description: "PyTorch-like deep learning framework built from scratch in C++.",
      technologies: ["c++", "simd", "openmp", "fastapi", "react"],
      link: "https://github.com/hwang2409/whitematter"
    },
    {
      title: "Parallel Robotics",
      date: "2025",
      description: "Building an autonomous service robot for medicinal care.",
      technologies: ["ros2", "nav2", "yolov8", "react", "three.js", "fastapi", "docker"],
    },
  ];

  return (
    <section className="py-10">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-100 mb-6 ">
	  	Projects
      </h2>
      <div className="space-y-8">
        {projects.map((project, index) => (
          <a
            key={index}
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block border-l-2 border-neutral-800 pl-4 hover:border-neutral-500 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer rounded-r-md"
          >
            <h3 className="text-lg font-semibold text-neutral-100 mb-2">
              {project.title}
            </h3>
            <p className="text-neutral-500 text-sm mb-2">
              {project.date}
            </p>
            <p className="text-neutral-300 mb-3 leading-relaxed">
              {project.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="text-neutral-500 text-sm"
                >
                  {tech}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
