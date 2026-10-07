import Experience from "@/components/experience/Experience";
import Hero from "@/components/sections/Hero";
import Capabilities from "@/components/sections/Capabilities";
import BusinessSolutions from "@/components/sections/BusinessSolutions";
import AgentNetwork from "@/components/sections/AgentNetwork";
import Engineering from "@/components/sections/Engineering";
import Team from "@/components/sections/Team";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return <Experience>
    <Hero />
    <Capabilities />
    <BusinessSolutions />
    <AgentNetwork />
    <Engineering />
    <Team />
    <Contact />
  </Experience>;
}
