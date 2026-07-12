'use client';

import {
  Layers, BrickWall, PanelTop, PanelBottom, DoorOpen, DoorClosed,
  Grip, Lightbulb, ScanFace, LayoutGrid, Palette, Armchair, Shield,
  Settings, Monitor, Camera, Wind, Music, Star, Wrench,
  type LucideProps,
} from 'lucide-react';
import type { ElementType } from 'react';

const ICON_MAP: Record<string, ElementType<LucideProps>> = {
  Layers, BrickWall, PanelTop, PanelBottom, DoorOpen, DoorClosed,
  Grip, Lightbulb, ScanFace, LayoutGrid, Palette, Armchair, Shield,
  Settings, Monitor, Camera, Wind, Music, Star, Wrench,
};

interface DynamicIconProps extends LucideProps {
  name: string;
}

export default function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon {...props} />;
}
