export default function Projects() {
  const projects = [
    {
      title: "NFL Game Prediction System",
      date: "2025",
      description: "ensemble ML system predicting NFL outcomes at 89% accuracy.",
      technologies: ["python", "xgboost", "fastapi", "next.js", "postgresql", "redis", "docker"],
      link: "https://github.com/hwang2409/bet"
    },
    {
      title: "hang.ai",
      date: "Sep. 2025 - Present",
      description: "ai-powered study platform with microservices architecture.",
      technologies: ["fastapi", "react", "kong", "postgresql", "redis", "rabbitmq", "celery"],
      link: "http://hangai-six.vercel.app"
    },
    {
      title: "fishaudio",
      date: "2025",
      description: "ai audio/video generation platform with tts and daw editor.",
      technologies: ["fastapi", "next.js", "sveltekit", "mongodb", "stripe", "hatchet"],
      link: "https://github.com/hwang2409/fishaudio"
    },
    {
      title: "neural network framework",
      date: "Aug. 2024 - Nov. 2024",
      description: "pytorch-like deep learning framework built from scratch in c++.",
      technologies: ["c++", "simd", "openmp", "fastapi", "react"],
      link: "https://github.com/hwang2409/penguin_net"
    },
    {
      title: "parallel",
      date: "2025",
      description: "autonomous service robot with slam navigation and object detection.",
      technologies: ["ros2", "nav2", "yolov8", "react", "three.js", "fastapi", "docker"],
      link: "https://github.com/hwang2409/parallel"
    },
    {
      title: "ollama host",
      date: "2025",
      description: "self-hosted chatgpt-style interface for local llm models.",
      technologies: ["django", "react", "redis", "postgresql", "docker"],
      link: "https://github.com/hwang2409/ollama-host"
    },
    {
      title: "cas",
      date: "2024",
      description: "computer algebra system with dag-based symbolic computation.",
      technologies: ["c++"],
      link: "https://github.com/hwang2409/cas"
    },
    {
      title: "crutch",
      date: "2024",
      description: "symbolic math library with calculus and equation solving.",
      technologies: ["python", "networkx", "numpy"],
      link: "https://github.com/hwang2409/crutch"
    },
    {
      title: "whitematter",
      date: "2025",
      description: "hugging face dataset management and model training platform.",
      technologies: ["django", "celery", "next.js", "redis"],
      link: "https://github.com/hwang2409/whitematter"
    },
    {
      title: "arena",
      date: "2024",
      description: "memory arena allocator with o(1) allocation and simd alignment.",
      technologies: ["c"],
      link: "https://github.com/hwang2409/arena"
    },
    {
      title: "llama_sim",
      date: "Dec. 2024 - Present",
      description: "logic gate simulator for creating and testing circuits.",
      technologies: ["c", "javascript", "webassembly"],
      link: "https://github.com/hwang2409/llama_sim"
    },
  ];

  return (
    <section className="py-10">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-100 mb-6 ">
        projects
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
