export default function Awards() {
  const awards = [
    {
      title: "Hypatia Math Contest - National Champion",
      date: "2023-2024",
      description: "Perfect score, placing first out of 5000+ participants."
    },
    {
      title: "AMC12 - Top 5%",
      date: "2023-2024",
      description: "Qualified for AIME with a score of 124.5."
    },
    {
      title: "Canadian Lynx Math Contest - Bronze Medal",
      date: "2023-2024",
      description: "Bronze on the Canadian Lynx Math Contest, hosted by UWaterloo."
    }
  ];

  return (
    <section className="py-10">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-100 mb-6 ">
      Awards
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
