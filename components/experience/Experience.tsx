"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import ExperienceMotionProvider from "./ExperienceMotion";
import Navigation from "../layout/Navigation";

const FulcrumWorld = dynamic(() => import("../three/FulcrumWorld"), { ssr: false });

class WorldBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <p className="webgl-fallback">The interactive scene needs WebGL. You can still explore our work below.</p> : this.props.children;
  }
}

export default function Experience({ children }: { children: ReactNode }) {
  return <ExperienceMotionProvider>
    <div className="persistent-world" aria-hidden="true"><WorldBoundary><FulcrumWorld /></WorldBoundary></div>
    <div className="reading-shade" aria-hidden="true" />
    <Navigation />
    <main id="main">{children}</main>
  </ExperienceMotionProvider>;
}
