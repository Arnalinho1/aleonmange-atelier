"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * Porte d'entrée de la cérémonie d'inauguration — montée au layout (même
 * pattern que LettreInfo/Consentement). Sans `?inauguration` dans l'URL :
 * rend null, ZÉRO impact (aucun DOM, la séquence complète reste dans un
 * chunk lazy jamais chargé). Le param est lu côté client au montage (pas de
 * useSearchParams : la home resterait sinon suspendue à une frontière
 * Suspense — et le canonical, posé statiquement par buildMetadata, est de
 * toute façon insensible à la query). Stateless et rejouable : recharger
 * avec le param rejoue la cérémonie.
 */

const Ceremonie = dynamic(() => import("./Ceremonie"), { ssr: false });

export function Inauguration() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (new URLSearchParams(window.location.search).has("inauguration")) setActive(true);
      } catch {
        // Query illisible : pas de cérémonie, la page vit normalement.
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!active) return null;
  return <Ceremonie />;
}
