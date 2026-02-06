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
    <section className="py-10">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-100 mb-6 ">
      awards
      </h2>
      <div className="space-y-8">
        {awards.map((award, index) => (
          <div key={index} className="border-l-2 border-neutral-800 pl-4">
            <h3 className="text-lg font-semibold text-neutral-100 mb-2">
              {award.title}
            </h3>
            <p className="text-neutral-500 text-sm mb-3">
              {award.date}
            </p>
            <p className="text-neutral-300 leading-relaxed">
              {award.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
