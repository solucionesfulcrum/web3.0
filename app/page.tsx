import Experience from "@/components/experience/Experience";
import Hero from "@/components/sections/Hero";
import Capabilities from "@/components/sections/Capabilities";
import AgentNetwork from "@/components/sections/AgentNetwork";
import Engineering from "@/components/sections/Engineering";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return <Experience>
    <Hero />
    <Capabilities />
    <AgentNetwork />
    <Engineering />
    <Contact />
  </Experience>;
}
