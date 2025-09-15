export default function Projects() {
  const projects = [
    {
      title: "hang.ai",
      date: "Sep. 2025 - Present",
      description: "ai-powered study app that optimizes study efficiency and effectiveness.",
      technologies: ["next.js", "tailwind css", "react", "python", "postgresql", "django"],
      link: "http://hangai-six.vercel.app"
    },
    {
      title: "chimy: 3d software renderer",
      date: "Dec. 2023 - Present",
      description: "software renderer for real-time generation and user navigation around 3d models.",
      technologies: ["c", "sdl2"],
      link: "https://github.com/hwang2409/chimy"
    },
    {
      title: "poki-musi: retro game console",
      date: "Oct. 2024 - Dec. 2024",
      description: "retro-style 8-bit game console",
      technologies: ["python", "c", "raspberry pi"],
      link: "https://github.com/hwang2409/poki-musi"
    },
    {
      title: "penguin_net: neural network framework",
      date: "Aug. 2024 - Nov. 2024",
      description: "machine learning library for building and training neural networks.",
      technologies: ["c++"],
      link: "https://github.com/hwang2409/penguin_net"
    },
    {
      title: "llama_sim: logic gate simulator",
      date: "Dec. 2024 - Present",
      description: "tool for creating and testing complex circuits with elementary logic gates.",
      technologies: ["c", "javascript", "webassembly"],
      link: "https://github.com/hwang2409/llama_sim"
    },
  ];

  return (
    <section className="mb-4">
      <h2 className="text-2xl font-bold text-black mb-2 underline">
        projects
      </h2>
      <div className="space-y-6">
        {projects.map((project, index) => (
          <a
            key={index}
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block border-l-2 border-gray-600 pl-4 hover:border-gray-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer rounded-r-md"
          >
            <h3 className="text-lg font-bold text-black mb-2">
              {project.title}
            </h3>
            <p className="text-gray-400 text-sm mb-2">
              {project.date}
            </p>
            <p className="text-black mb-3 leading-relaxed">
              {project.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="text-gray-400 text-sm"
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

