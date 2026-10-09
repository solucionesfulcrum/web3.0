"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import ExperienceMotionProvider from "./ExperienceMotion";
import Navigation from "../layout/Navigation";
import SalesAdvisor from "./SalesAdvisor";
import { useLanguage } from "../i18n/LanguageProvider";

function WorldFallback() {
  const { t } = useLanguage();
  return <p className="webgl-fallback">{t("The interactive scene needs WebGL. You can still explore our work below.")}</p>;
}

const FulcrumWorld = dynamic(() => import("../three/FulcrumWorld"), { ssr: false });
const WorldBackdrop = dynamic(() => import("../three/FulcrumWorld").then(module => module.WorldBackdrop), { ssr: false });

class WorldBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <WorldFallback /> : this.props.children;
  }
}

export default function Experience({ children }: { children: ReactNode }) {
  return <ExperienceMotionProvider>
    <div className="persistent-world" aria-hidden="true"><WorldBoundary><WorldBackdrop /></WorldBoundary></div>
    <div className="persistent-world advisor-world" aria-hidden="true"><WorldBoundary><FulcrumWorld /></WorldBoundary></div>
    <div className="reading-shade" aria-hidden="true" />
    <Navigation />
    <main id="main">{children}</main>
    <SalesAdvisor />
  </ExperienceMotionProvider>;
}
