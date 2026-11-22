
# 🗂️ Case Archive

**Tamper-evident digital case and evidence management for police, prosecutors and courts.**

Every document is fingerprinted and sealed. Every action is logged.
If a single byte changes after sealing, Case Archive tells you.


---

## Why this exists

A case file is only useful in court if you can prove it was not altered. Today that proof is often a signature, a register entry, or "trust us". Case Archive makes it checkable:

- **Case documents** are sealed the moment they are uploaded, so any later change is detected.
- **Physical evidence** carries a permanent chain-of-custody log.
- **Every action** is recorded in an audit trail, so you always know who did what and when.

## Features

| | |
|---|---|
| 🔐 **Tamper detection** | Upload a document and it is sealed. Click **Verify Integrity** on one document, or **Verify all** on a whole case, to confirm nothing has changed. Altered documents are flagged **Compromised**. |
| 📁 **Case management** | File cases, track their status (Under Investigation, Charge Sheet Filed, In Court, Closed) and keep every FIR, witness statement, forensic report and court filing in one place. |
| 📦 **Evidence & chain of custody** | Log physical items and record every transfer of custodian, location and status. The history cannot be edited. |
| 🧾 **Audit trail** | A running record of every upload, view, download, verification, transfer and invite on each case. |
| 👥 **Secure sharing** | Invite a colleague with a one-time link. They join read-only as a **Prosecutor** or **Court Clerk**. You can see who has access and revoke it any time. |
| 🔎 **Document insights** | Dates, legal sections (IPC, BNS, BNSS, CrPC and more), parties, names and key terms are picked out automatically from text documents. |
| 📄 **Printable case report** | Re-checks every document, then produces a clean report you can print or save as a PDF. |
| 👁️ **Built-in preview** | Open text, PDF and image files right in the app. |

## Who can do what

| | Investigator (owner) | Prosecutor | Court Clerk |
|---|:-:|:-:|:-:|
| Create and edit cases | ✅ | ❌ | ❌ |
| Upload documents | ✅ | ❌ | ❌ |
| Log and transfer evidence | ✅ | ❌ | ❌ |
| Invite and revoke people | ✅ | ❌ | ❌ |
| View, verify, download, print report | ✅ | ✅ | ✅ |

There are no passwords to manage. Enter your name to start a workspace; invitees open a one-time link, type their own name and pick their role. Records made by invitees are marked **"name and role not verified"**.

> **Identity is not verified yet.** Case Archive cannot currently confirm that an invitee is a real person, or that they actually hold the role they pick (Prosecutor or Court Clerk). Names and roles are self-declared, so the owner must share invite links only with people they trust. Invitees are read-only and every record they create is labelled "name and role not verified" along with who invited them. Verified identities (official ID or single sign-on) are the next step before real-world use.

## Try it

1. Start a workspace and create a case.
2. Upload a document (`.txt`, `.pdf` or an image) and open it to see its status.
3. Log an evidence item and transfer its custody a couple of times.
4. Invite a colleague and watch them appear in the audit trail.
5. Print the case report.

## Built with

React · Vite · Node.js · Express · Supabase (Postgres and Storage)

## License

Released under the [MIT License](LICENSE).
