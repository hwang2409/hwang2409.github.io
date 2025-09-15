export default function Awards() {
  const awards = [
    {
      title: "hypatia math contest - national champion",
      date: "Apr. 5th, 2023",
      description: "perfect score, placing first out of 5000+ participants."
    },
    {
      title: "amc12 - top 5%",
      date: "Nov. 6th, 2023",
      description: "score of 124.5, qualified for AIME."
    },
    {
      title: "nrg hacks: finalist",
      date: "Dec. 12th, 2023",
      description: "developed an AI-powered teacher assistant website.",
    },
    {
      title: "canadian lynx math contest - bronze medal",
      date: "Sept. 28th, 2023",
      description: "bronze on the canadian lynx math contest, hosted by the university of waterloo."
    }
  ];

  return (
    <section className="mb-4">
      <h2 className="text-2xl font-bold text-black mb-2 underline">
      awards
      </h2>
      <div className="space-y-6">
        {awards.map((award, index) => (
          <div key={index} className="border-l-2 border-gray-600 pl-4">
            <h3 className="text-lg font-bold text-black mb-2">
              {award.title}
            </h3>
            <p className="text-gray-400 text-sm mb-3">
              {award.date}
            </p>
            <p className="text-black leading-relaxed">
              {award.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

