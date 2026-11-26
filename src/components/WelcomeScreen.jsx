import React from 'react';
import { Sparkles, ArrowRight, Code2, Lightbulb, Mail, Compass } from 'lucide-react';

const STARTER_PROMPTS = [
  {
    icon: Lightbulb,
    title: 'Explain Simply',
    prompt: 'Explain how APIs and serverless functions work together in simple terms.'
  },
  {
    icon: Code2,
    title: 'Write Clean Code',
    prompt: 'Write a reusable JavaScript debounce function with a quick usage example.'
  },
  {
    icon: Mail,
    title: 'Draft a Message',
    prompt: 'Draft a polite, clear email to share my new web project for feedback.'
  },
  {
    icon: Compass,
    title: 'Plan a Project',
    prompt: 'Give me a step-by-step study plan to master React in 2 weeks.'
  }
];

export default function WelcomeScreen({ onSelectPrompt }) {
  return (
    <section className="welcome-screen" aria-label="Welcome">
      <div className="welcome-hero">
        <div className="welcome-icon-wrap" aria-hidden="true">
          <Sparkles size={34} />
        </div>
        <h2 className="welcome-title">How can Nova help you today?</h2>
        <p className="welcome-subtitle">
          Ask questions, brainstorm ideas, debug code, or draft messages with Google Gemini.
        </p>
      </div>

      <div className="starter-grid">
        {STARTER_PROMPTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              className="starter-card"
              onClick={() => onSelectPrompt(item.prompt)}
            >
              <div className="starter-card-top">
                <span className="starter-card-icon">
                  <Icon size={17} />
                </span>
                <span className="starter-card-title">{item.title}</span>
              </div>
              <p className="starter-card-prompt">{item.prompt}</p>
              <span className="starter-card-arrow" aria-hidden="true">
                <ArrowRight size={15} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
