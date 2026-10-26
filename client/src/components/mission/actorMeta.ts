import { Package, Plane, Truck, type LucideIcon } from 'lucide-react';
import type { ActorKind } from '@/types/api';

export const KIND_ICONS: Record<ActorKind, LucideIcon> = { drone: Plane, rover: Truck, parcel: Package };
