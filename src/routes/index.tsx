import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Atom, BrainCircuit, FlaskConical, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MOSLab AI — Predict. Optimize. Sense Smarter." },
      {
        name: "description",
        content:
          "AI-assisted platform for optimizing experimental conditions of MOS gas sensors.",
      },
    ],
  }),
  component: HomePage,
});

const features = [
  {
    icon: BrainCircuit,
    title: "AI Prediction",
    desc: "Predict sensor response from material, gas, temperature, and concentration using trained ML models.",
  },
  {
    icon: FlaskConical,
    title: "Experimental Optimization",
    desc: "Recommend optimal operating conditions for sensitivity, recovery time, or overall performance.",
  },
];

function HomePage() {
  return (
    <div className="space-y-20">
      <section className="relative -mx-6 lg:-mx-10 px-6 lg:px-10 py-20 lg:py-28 bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--primary) 20%, transparent) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
          >
            <Atom className="size-3.5" />
            AI Research Platform · MOS Gas Sensors
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="mt-6 font-display text-5xl lg:text-7xl font-semibold tracking-tight"
          >
            MOSLab <span className="text-gradient">AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-4 text-xl lg:text-2xl font-display text-muted-foreground"
          >
            Predict. Optimize. Sense Smarter.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-sm lg:text-base text-foreground/80 max-w-2xl leading-relaxed"
          >
            MOSLab AI supports research workflows for MOS gas sensing by combining
            structured experimental data, predictive modeling, and comparison tools
            for broad material and target-gas studies. The platform is designed to
            grow with new datasets and support AI-ready experimentation across future
            sensor programs.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Button asChild size="lg" className="bg-gradient-primary hover:opacity-95 shadow-elegant">
              <Link to="/predict">
                Start Analysis <ArrowRight className="size-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <section>
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-primary font-medium">
            Capabilities
          </div>
          <h2 className="mt-2 font-display text-2xl lg:text-3xl font-semibold">
            What the platform delivers
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -3 }}
                className="group rounded-2xl border border-border bg-card p-6 shadow-elegant transition-colors hover:border-primary/30"
              >
                <div className="size-11 rounded-xl bg-primary-soft text-primary grid place-items-center mb-4 transition-transform group-hover:scale-105">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-display font-semibold text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
