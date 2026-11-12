"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/i18n";
import { updateProfile } from "@/lib/actions";
import { useStore } from "@/lib/store";
import type { Category, SectorId, Slot, User } from "@/lib/types";
import { InterestPicker, SectorPicker, SlotPicker } from "./ProfileFields";
import { LanguageSwitch } from "./LanguageSwitch";
import { Icon } from "./Icon";
import { Avatar, useToast } from "./ui";

/** Profile editor shared by the three roles; it only shows what makes sense for each role. */
export function ProfileForm({ user }: { user: User }) {
  const { run } = useStore();
  const { t, f } = useI18n();
  const [toast, showToast] = useToast();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [bio, setBio] = useState(f.text(user.bio));
  const [sector, setSector] = useState<SectorId>(user.sector);
  const [interests, setInterests] = useState<Category[]>(user.interests);
  const [availability, setAvailability] = useState<Slot[]>(user.availability);
  const [areas, setAreas] = useState<SectorId[]>(user.companion?.sectors ?? []);
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return setError(t.auth.errors.firstName);
    if (!lastName.trim()) return setError(t.auth.errors.lastName);
    setError(null);
    run((s) =>
      updateProfile(s, user.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        ...(user.role !== "family" ? { sector, interests, availability } : {}),
        ...(user.role === "companion" ? { companionSectors: areas.length ? areas : [sector] } : {}),
      }),
    );
    showToast(t.profile.saved);
  }

  return (
    <form className="stack-lg" onSubmit={submit} noValidate>
      <section className="card">
        <div className="row" style={{ gap: 14 }}>
          <Avatar user={{ id: user.id, firstName, lastName }} size={64} />
          <div className="min-0">
            <h2 style={{ fontSize: "1.25rem" }}>
              {firstName} {lastName}
            </h2>
            <p className="muted small" style={{ overflowWrap: "anywhere" }}>
              {t.roles[user.role]} · {user.email}
            </p>
          </div>
        </div>
        <div className="fields-2">
          <div className="field">
            <label htmlFor="pf-first">{t.auth.firstName}</label>
            <input
              id="pf-first"
              className="input"
              value={firstName}
              autoComplete="given-name"
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="pf-last">{t.auth.lastName}</label>
            <input
              id="pf-last"
              className="input"
              value={lastName}
              autoComplete="family-name"
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="pf-bio">{t.profile.bio}</label>
          <textarea id="pf-bio" className="input" value={bio} maxLength={280} onChange={(e) => setBio(e.target.value)} />
        </div>
      </section>

      {user.role !== "family" ? (
        <section className="card">
          <SectorPicker legend={t.profile.sector} value={sector} onChange={setSector} />
          {user.role === "companion" ? <SectorPicker multiple legend={t.companion.profileAreas} value={areas} onChange={setAreas} /> : null}
          <InterestPicker legend={t.profile.interests} value={interests} onChange={setInterests} />
          <SlotPicker legend={t.profile.availability} help={t.profile.availabilityHelp} value={availability} onChange={setAvailability} />
        </section>
      ) : null}

      <section className="card">
        <h2 style={{ fontSize: "1.2rem" }}>{t.profile.account}</h2>
        <div className="row-between">
          <span className="row" style={{ gap: 8 }}>
            <Icon name="globe" /> {t.profile.language}
          </span>
          <LanguageSwitch />
        </div>
      </section>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="row">
        <button type="submit" className="btn btn-block-mobile">
          <Icon name="check" /> {t.common.save}
        </button>
      </div>
      {toast}
    </form>
  );
}
