import { createContext, useContext, type ReactNode } from 'react';
import { PaneDef, Shell, View } from './Shell';

export interface FrameContext {
  view: View;
  onNavigate(v: View): void;
  repo?: string;
  branch?: string | null;
  status?: ReactNode;
}

export const FrameCtx = createContext<FrameContext>({ view: 'overview', onNavigate: () => {} });

/** Lets each view choose its own side panes while App owns navigation and repo info. */
export function Frame(props: { left?: PaneDef; right?: PaneDef; children: ReactNode }) {
  const ctx = useContext(FrameCtx);
  return <Shell {...ctx} left={props.left} right={props.right}>{props.children}</Shell>;
}
