import { useEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import SplitType from "split-type";

gsap.registerPlugin(ScrollTrigger);

const AboutSection = () => {
  useEffect(() => {
    const split = new SplitType(".cool-split h2", {
      types: "words, chars",
    });

    gsap
      .timeline({
        scrollTrigger: {
          trigger: ".about",
          start: "top 0%",
          end: "+=105%",
          scrub: 0.5,
        },
      })
      .set(
        split.chars,
        {
          duration: 0.3,
          color: "white",
          stagger: 0.1,
        },
        0.1
      );
  }, []);

  return (
    <section className="about_section text-center cool-split">
      <h3 className="grad_text">About Recallo</h3>
      <h2 className="mb-2 mt-2">
        Recallo is an intelligent, AI powered learning companion designed to
        revolutionize how you retain knowledge.
      </h2>
    </section>
  );
};

export default AboutSection;
