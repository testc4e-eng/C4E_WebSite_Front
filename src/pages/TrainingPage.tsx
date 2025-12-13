import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

/* ============================================================
   COUNTDOWN (intégré – remplace "En cours")
============================================================ */
const Countdown = ({ targetDate }: { targetDate: string }) => {
  const compute = () => {
    const diff = +new Date(targetDate) - +new Date();
    if (diff <= 0) return null;

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  };

  const [time, setTime] = useState(compute());

  useEffect(() => {
    const t = setInterval(() => setTime(compute()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!time) {
    return (
      <span className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-full">
        Formation démarrée
      </span>
    );
  }

  const Box = ({ v, l }: { v: number; l: string }) => (
    <div className="bg-black/90 text-white rounded-xl px-4 py-3 min-w-[78px] text-center">
      <div className="text-2xl font-bold tabular-nums">
        {String(v).padStart(2, "0")}
      </div>
      <div className="text-xs text-gray-300 tracking-wide">{l}</div>
    </div>
  );

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      <Box v={time.days} l="JOURS" />
      <Box v={time.hours} l="HEURES" />
      <Box v={time.minutes} l="MINUTES" />
      <Box v={time.seconds} l="SECONDES" />
    </div>
  );
};

/* ============================================================
   PAGE FORMATION
============================================================ */
const TrainingPage = () => {
  const { formationId } = useParams();

  const trainingData = {
    wasp: {
      title: "Formation WASP",
      subtitle: "Modélisation de la qualité d’eau de surface",
      icon: "📊",

      startDate: "2026-01-12T09:00:00",

      intro: [
        "Une semaine de formation sur la modélisation de la qualité de l'eau et l’application du modèle WASP (Water Quality Analysis Simulation Program).",
        "C4E Africa a l’honneur de vous convier à une semaine de formation technique de haut niveau sur le modèle WASP, animée par le développeur du modèle, M. Tim Wool."
      ],

      objectives: [
        "Combler le fossé entre la théorie académique et la pratique opérationnelle.",
        "Apprendre à coupler l’hydrodynamique avec la qualité de l’eau pour résoudre des problématiques réelles du contexte marocain."
      ],

      targets: {
        professionals:
          "Acquérir une autonomie dans la configuration de modèles pour simuler l’impact des rejets (STEP, industriels, agricoles) et évaluer les scénarios de gestion.",
        academics:
          "Approfondir la compréhension des équations cinétiques (biogéochimie) et maîtriser un outil de recherche standard utilisé mondialement pour la publication scientifique."
      },

      trainer: [
        "M. Tim Wool, Ex-Senior Environmental Scientist à l’Agence de Protection de l’Environnement des États-Unis (US EPA – Region 4).",
        "Développeur principal du modèle WASP, expert reconnu internationalement dans le développement de TMDL (Total Maximum Daily Loads) et la modélisation de la qualité de l’eau.",
        "Sa pédagogie repose sur l’application directe des modèles pour résoudre des problématiques environnementales complexes."
      ],

      program: [
        {
          title: "MODULE 1 : Fondamentaux et Transport",
          items: [
            "Principes fondamentaux, bilans de masse et processus physiques, chimiques et biologiques",
            "Structure de WASP : historique, architecture et exigences en matière de données",
            "Segmentation et transport : conditions aux limites et charges",
            "Hydrodynamique : routage des débits et couplage hydrodynamique"
          ]
        },
        {
          title: "MODULE 2 : Qualité de l’Eau et Application Pratique",
          items: [
            "Eutrophisation : cycles de l’azote, du phosphore, du phytoplancton et de l’oxygène dissous",
            "Modélisation des toxiques et micropolluants",
            "Gestion des données (WRDB) et post-traitement",
            "Atelier de calibration et configuration complète – bassin du Sebou"
          ]
        }
      ],

      logistics: {
        lieu: "Fès",
        dates: "12 – 16 janvier 2026",
        horaires: "09h00 – 18h00 (pauses incluses)",
        prerequis: "Ordinateur portable (Windows)"
      },

pricing: {
  individuel: [
    { label: "Académiciens & Chercheurs", price: "10 000 DH" },
    { label: "Secteur Privé (Bureaux d’études, Indépendants)", price: "15 000 DH" }
  ],
  groupe: [
    {
      label: "Binôme chercheurs (2 personnes)",
      price: "15 000 DH"
    },
    {
      label: "Même société (2 personnes)",
      price: "25 000 DH"
    }
  ]
},

      formLink:
        "https://docs.google.com/forms/d/e/1FAIpQLSeza98C57atNG6cYrqI5CCqodd4OjtcHorVSu3d_L826R6B-A/viewform"
    }
  };

  const training = trainingData[formationId as keyof typeof trainingData];

  if (!training) {
    return (
      <main className="pt-24 min-h-screen flex items-center justify-center">
        <h1 className="text-3xl font-bold">Formation non trouvée</h1>
      </main>
    );
  }

  return (
    <main className="pt-24 md:pt-28 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="container mx-auto px-6 max-w-5xl">

        {/* ================= HEADER ================= */}
        <header className="text-center mb-20">
          <div className="text-4xl mb-4">{training.icon}</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{training.title}</h1>
          <p className="text-xl text-gray-600 mb-6">{training.subtitle}</p>
          <Countdown targetDate={training.startDate} />
        </header>

        {/* ================= INTRO ================= */}
        <section className="bg-white rounded-2xl shadow p-8 mb-12 space-y-4">
          {training.intro.map((p, i) => (
            <p key={i} className="text-gray-700 leading-relaxed">{p}</p>
          ))}
        </section>

        {/* ================= OBJECTIFS ================= */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-4">1. Objectifs et portée</h2>
          {training.objectives.map((p, i) => (
            <p key={i} className="text-gray-700 mb-4">{p}</p>
          ))}

          <div className="grid md:grid-cols-2 gap-6">
            <Card title="Pour les professionnels" text={training.targets.professionals} />
            <Card title="Pour les académiciens" text={training.targets.academics} />
          </div>
        </section>

        {/* ================= FORMATEUR ================= */}
        <section className="bg-white rounded-2xl shadow p-8 mb-16">
          <h2 className="text-2xl font-bold mb-4">2. L’expert formateur</h2>
          {training.trainer.map((p, i) => (
            <p key={i} className="text-gray-700 mb-3">{p}</p>
          ))}
        </section>

        {/* ================= PROGRAMME ================= */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">3. Programme technique</h2>
          {training.program.map((m, i) => (
            <div key={i} className="bg-white rounded-2xl shadow p-8 mb-6">
              <h3 className="font-semibold mb-4">{m.title}</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {m.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* ================= LOGISTIQUE ================= */}
        <section className="grid md:grid-cols-4 gap-6 mb-16">
          <Info label="Lieu" value={training.logistics.lieu} />
          <Info label="Dates" value={training.logistics.dates} />
          <Info label="Horaires" value={training.logistics.horaires} />
          <Info label="Pré-requis" value={training.logistics.prerequis} />
        </section>

{/* ================= TARIFS ================= */}
<section className="bg-white rounded-2xl shadow p-8 mb-12">
  <h2 className="text-2xl font-bold mb-6">5. Frais de participation</h2>

  {/* Tarifs individuels */}
  <h3 className="font-semibold mb-3">Tarifs individuels</h3>
  <table className="w-full border mb-6">
    <tbody>
      {training.pricing.individuel.map((p, i) => (
        <tr key={i} className="border-b">
          <td className="p-4">{p.label}</td>
          <td className="p-4 font-semibold">{p.price}</td>
        </tr>
      ))}
    </tbody>
  </table>

  {/* Tarifs groupés */}
  <h3 className="font-semibold mb-3">Tarifs groupés</h3>
  <table className="w-full border">
    <tbody>
      {training.pricing.groupe.map((p, i) => (
        <tr key={i} className="border-b bg-blue-50/40">
          <td className="p-4">{p.label}</td>
          <td className="p-4 font-semibold">{p.price}</td>
        </tr>
      ))}
    </tbody>
  </table>
</section>


        {/* ================= FORMULAIRE ================= */}
        <section className="text-center mb-24">
          <a
            href={training.formLink}
            target="_blank"
            className="inline-block px-10 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
          >
            S’inscrire à la formation
          </a>
        </section>

      </div>
    </main>
  );
};

/* ================= UI HELPERS ================= */

const Card = ({ title, text }: any) => (
  <div className="bg-white rounded-xl shadow p-6">
    <h3 className="font-semibold mb-2">{title}</h3>
    <p className="text-gray-700">{text}</p>
  </div>
);

const Info = ({ label, value }: any) => (
  <div className="bg-white rounded-xl p-6 shadow text-center">
    <p className="font-semibold">{label}</p>
    <p className="text-gray-600">{value}</p>
  </div>
);

export default TrainingPage;