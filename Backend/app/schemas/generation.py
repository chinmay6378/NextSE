"""Pydantic models that double as OpenAI structured-output JSON schemas.

These describe exactly what we ask the LLM to return for each of the three
generation calls kicked off by POST /clients/{id}/generate-profile. They are
also used to validate the parsed response before it's persisted.
"""

from pydantic import BaseModel, ConfigDict, Field

# extra="forbid" is required on every one of these models (including nested
# ones) so Pydantic's model_json_schema() emits "additionalProperties": false,
# which OpenAI's structured-output "strict" mode requires at every object level.
_STRICT = ConfigDict(extra="forbid")


class ObjectionNote(BaseModel):
    model_config = _STRICT

    objection: str
    recommended_response: str


class GeneratedClientProfile(BaseModel):
    model_config = _STRICT

    company_snapshot: str = Field(description=(
        "Section 1 — Company Snapshot. Extract ONLY what is explicitly in the documents. "
        "Fields: Company Name, Tagline/Brand Positioning, Website(s), Industry, Sub-Industry, "
        "Founded Year, History & Milestones, Employee Count, Turnover Band, HQ Location, "
        "Plant/Factory Locations, Branch/Office Locations, Ownership Type (founder-led/PE/listed), "
        "Group Companies, Key Leadership (Name + Designation — identify likely Economic Buyer), "
        "Awards & Recognition, LinkedIn URL, YouTube URL, Social Media Links. "
        "End with 'SE Ice-Breaker': one notable fact or recent achievement the SE can reference "
        "in the first 60 seconds to show they've done their homework. "
        "CRITICAL: Completely OMIT any field not found in documents. No placeholders."
    ))

    offer_and_products: str = Field(description=(
        "Section 2 — Offer & Products. Apply the FAB Chain (Care): Feature → Advantage → Benefit "
        "for each product. Benefit MUST resolve to Time, Money, or People terms. Apply 3WM+M: "
        "tag each offering as Revenue↑ / Cost↓ / Risk Mitigation / Mission. "
        "Fields: Primary Product/Service (1-liner), Core Problem it Eliminates (buyer-language), "
        "Full Product/Service List with Categories, Specifications Table (markdown table with "
        "grade/size/material per product), Applications per Product (industry × use-case), "
        "Standards & Compliance (IS/ASTM/DIN/BIS etc.), Custom/EPC Capability, New/Upcoming Products, "
        "Top 3 USPs (each with SE Translation: 'What this means to you is...'). "
        "End with 'IVR Trigger': one industry-specific pain statement an SE opens with to trigger "
        "'Has that ever happened to you?' "
        "CRITICAL: Completely OMIT any field not in documents."
    ))

    ideal_buyer_profile: str = Field(description=(
        "Section 3 — Ideal Buyer Profile. Apply MEDDIC Metrics lens — what measurable outcomes "
        "does this client's best customer achieve? "
        "Fields: Best Margin Segment, Fastest Converting Segment, Ideal Client Size (turnover/employees), "
        "Best Designations to Target (Initiator → Evaluator → Economic Buyer), "
        "Likely Negotiator Type by Role (Analyst = data-driven skeptic / Accommodator = relationship-first "
        "/ Assertive = time-is-money direct — classify each buyer role), "
        "Segments with Most Repeat Orders, Segments to Avoid (and why), "
        "Primary Geographies, Secondary/Emerging Geographies, Average Sales Cycle Length. "
        "End with 'ICP Qualifier': 5 yes/no questions the SE asks in the first call to confirm fit. "
        "CRITICAL: Completely OMIT any field not in documents."
    ))

    buyer_committee: str = Field(description=(
        "Section 4 — Buyer Committee. Apply Voss Stakeholder Power Mapping. "
        "Fields: Who Initiates the Requirement (Initiator), Technical Evaluator (User/Influencer), "
        "Economic Buyer (who SIGNS — not always the senior person), "
        "Gatekeeper/Blocker (likely motivation — how to make them look good in the face of change: "
        "'How do we make this a win for your team?'), "
        "Champion Profile (what makes someone a good internal advocate — they must personally WIN when we win), "
        "Pronoun Power Signals (heavy 'I/me' = less power, real authority elsewhere; "
        "heavy 'we/they' = hidden decision makers; deflects to 'committee/boss' = cannot close alone), "
        "Approval Layers Before PO, Typical Timeline — First Contact to PO. "
        "End with 'Stakeholder Conversation Opener': one-line opening script for each role "
        "(Economic Buyer / Technical Evaluator / End User / Gatekeeper). "
        "CRITICAL: Completely OMIT any field not in documents."
    ))

    competitor_intelligence: str = Field(description=(
        "Section 5 — Competitor Intelligence. Apply Care's 5 Competitive Strategies + DNI Analysis. "
        "NEVER invent competitor names — only state what documents explicitly show. "
        "Fields: Competitor Names (document-sourced only), Why Clients Choose Competitors (specific reasons), "
        "Where This Client Wins (genuine edge), Competitor Pricing Position, "
        "Competitor Aggression Level (passive/moderate/aggressive), Key Competitor Weaknesses, "
        "DNI Risk Assessment: what does R0 (doing nothing) cost the prospect vs. R2 (risk of buying), "
        "Recommended Competitive Strategy: Frontal (clear superiority) / Flanking (shift criteria) / "
        "Fragment (win one dept first) / Defend (protect install base) / Develop (no opportunity yet). "
        "End with 'Competitive Battle Card': one-line SE response when a prospect says "
        "'we already use [Competitor X]' — use Voss Inverted Why or Accusation Audit technique. "
        "CRITICAL: Completely OMIT any field not in documents."
    ))

    sales_playbook: str = Field(description=(
        "Section 6 — Sales Playbook. The most critical section. Apply Care BVD 4-step process "
        "+ Voss calibrated question system. Avoid the TAG crimes (Tell/Accept/Guess). "
        "Fields: Top Lead Sources (ranked by conversion quality), Who Handles Sales, "
        "How Deals Close (the actual trigger sequence for a signed PO), "
        "Average Touchpoints Before First Response, Stage Where Deals Stall Most (and the fix), "
        "Top 3 Deal Loss Reasons + Prevention Script, Proof Content That Converts (tag each by stage), "
        "Is Field Visit Critical (and when to deploy), "
        "BVD Discovery Question Sequence (4 steps: gather all KBIs → verify complete → add your own "
        "issues as Challenger Insight → prioritize top 3; RULE: first issue stated is rarely #1), "
        "Calibrated Questions Bank (What/How only — never Why): 3 situation, 3 problem, "
        "2 implication, 2 urgency questions tailored to this client's buyers, "
        "Objection Battle Cards: for each top objection — Accusation Audit pre-empt + Calibrated Response, "
        "Cold Outreach Script: No-oriented opener + one-sentence non-responder email "
        "('Have you given up on [project]?'), "
        "Follow-Up Sequence: 4 touchpoints with channel + message type + timing. "
        "End with 'Accusation Audit': 3-5 preemptive labels the SE delivers before the prospect can raise them. "
        "CRITICAL: Completely OMIT any field not in documents."
    ))

    demand_and_timing: str = Field(description=(
        "Section 7 — Demand & Timing. Apply Voss deadline intelligence: real vs. artificial deadlines. "
        "Apply Care trigger-event selling. "
        "Fields: Purchase Triggers (budget cycles, expansion, breakdowns, regulation, competitive pressure), "
        "Demand Type (project/recurring/seasonal/replacement), Peak Buying Months, "
        "Slow Months (use for relationship deepening — NOT pushing), "
        "External Signals to Watch (price movement, policy changes, industry events that drive urgency). "
        "End with 'Deadline Intelligence': the likely real internal deadline the prospect faces "
        "(budget cycle, board meeting, product launch) and how to use it without revealing your own. "
        "CRITICAL: Completely OMIT any field not in documents."
    ))

    commercial_overview: str = Field(description=(
        "Section 8 — Commercial Overview. Apply Care's value-based framing: anchor on ROI before price. "
        "Never generate numbers not in documents. "
        "Fields: Average Order Value Range (₹), Average Project Value, Best Margin Segment %, "
        "Enquiry-to-Closure Rate %, Payment Terms, Repeat Order Frequency, Capacity Headroom. "
        "End with 'Value Conversation Anchor': how to frame the first commercial discussion as ROI "
        "using Time-Money-People terms, and one Voss price-pushback response: "
        "'That's fair — what else would need to be true for this to make sense?' "
        "CRITICAL: Never fabricate numbers. Completely OMIT any field not in documents."
    ))

    credibility_assets: str = Field(description=(
        "Section 9 — Credibility Assets. These are proof points — deploy them strategically. "
        "Fields: Notable Past Projects & Installations (scale/outcome if available), "
        "Key Client Names/Logos, Client List, Certifications (with scope), Export Countries, "
        "Website Quality Assessment, LinkedIn Status. "
        "For each major asset, tag its deployment timing: "
        "[EARLY — credibility] / [MID — validation] / [AT OBJECTION — proof] / [PRE-CLOSE — risk reduction]. "
        "CRITICAL: Completely OMIT any field not in documents."
    ))

    strategy_and_focus: str = Field(description=(
        "Section 10 — Strategy & Focus. Apply Care's Initiative Chart — align outreach to where "
        "this client is actively investing. "
        "Fields: Top Priorities for Next 12 Months, Segments to Grow (best to offer MOTM support), "
        "Segments to Exit, New Geographies Targeted, Product/Service Expansion Plans. "
        "End with 'MOTM Alignment Statement': 2-3 bullets showing exactly where MOTM's offering "
        "maps to this client's stated strategic direction — use this to open the first executive meeting. "
        "CRITICAL: Completely OMIT any field not in documents."
    ))

    watchlist_director_notes: str = Field(description=(
        "Section 11 — Watchlist / Director Notes. Red flags, sensitivities, escalation history, "
        "complaint patterns, special handling instructions, SE-level cautions. "
        "Apply Voss Black Swan lens: is the client Ill-Informed / Constrained / has Other Interests? "
        "If nothing relevant is found in the documents, return an empty string. "
        "Do NOT write any heading, label, or filler text."
    ))


class StudyModule(BaseModel):
    model_config = _STRICT

    title: str
    content: str


class Flashcard(BaseModel):
    model_config = _STRICT

    front: str
    back: str


class YoutubeVideo(BaseModel):
    model_config = _STRICT

    title: str = Field(description=(
        "Descriptive title telling engineers what they will learn about the PRODUCT — "
        "e.g. 'Industrial Ball Valve Working Principle Explained', 'How Pressure Relief Valves Work'."
    ))
    query: str = Field(description=(
        "YouTube search query about the PRODUCT TYPE or CATEGORY (NOT the company name). "
        "Focus on: how the product works, product demos, product selection, or industry application. "
        "Use exact product terminology from the documents."
    ))


class GeneratedStudyMaterial(BaseModel):
    model_config = _STRICT

    modules: list[StudyModule] = Field(description=(
        "Exactly 13 SE Training Modules aligned with the Care + Voss framework. Generate in order: "
        "1) The Four SE Roles (Care) — Technical Engineer / Salesperson / Trusted Advisor / Explainer; "
        "2) Product Mastery — FAB Chain (Feature→Advantage→Benefit→IS/DOES/MEANS) for every product, "
        "with 3WM+M tagging (Revenue↑ / Cost↓ / Risk / Mission); "
        "3) Business Value Discovery — Care BVD 4-step process with tailored question bank "
        "(gather KBIs → verify → add your own → prioritize; #1 rule: first issue is rarely top priority); "
        "4) Technical Discovery — Input/Process/Output question framework + Magic Wand questions + "
        "TAG crime audit (Tell/Accept/Guess — what NOT to do); "
        "5) Stakeholder Intelligence — Voss negotiator typing (Analyst/Accommodator/Assertive), "
        "pronoun power signals, champion development protocol (Similarity Principle), blocker neutralization; "
        "6) Competitive Positioning — DNI (Do Nothing Inc.) analysis with R0 vs R2 gap, "
        "5 competitive strategies (Frontal/Flanking/Fragment/Defend/Develop), competitive flanking script; "
        "7) Presentation & Demo Mastery — Care RM+3KP structure, attention curve, "
        "Demo GPS Roadmap (Chunks/Content/Clicks), Beautiful Beginning (PUNCH), Fantastic Finish; "
        "8) Objection Handling — Voss Accusation Audit + 10 full objection scripts "
        "(OBJECTION → AUDIT PRE-EMPT → CALIBRATED RESPONSE → LACE close); "
        "9) Negotiation Framework — Three types of Yes (Commitment/Confirmation/Counterfeit), "
        "Ackerman model (65→85→95→100%), Black Swan diagnostic, Rule of Three, MARS-BARS; "
        "10) Follow-Up & Re-Engagement — Non-responder sequence (3 steps), post-demo questions, "
        "deadline-based cadence, champion protocol; "
        "11) POC Management — Care 7 phases with product-specific success criteria template; "
        "12) Trust & Executive Engagement — CRISP equation (T=(C+R+I)/S×P), executive wants ranking, "
        "executive meeting opening script using business drivers not features; "
        "13) Field Preparation Toolkit — Pre-call One Sheet, Discovery Cheat Sheet, "
        "Objection Quick-Reference, Post-call Debrief checklist. "
        "Never skip or merge modules. Each module must be thorough with detailed content."
    ))

    flashcards: list[Flashcard] = Field(description=(
        "Exactly 20 knowledge-test flashcards testing SE competencies: "
        "5 Product Knowledge (specs, features, applications from documents), "
        "5 Discovery Skills (BVD process, calibrated questions, TAG crimes), "
        "5 Stakeholder & Objection (negotiator types, Accusation Audit, objection responses), "
        "5 Value & Negotiation (FAB chain, 3WM+M, Ackerman, Rule of Three). "
        "Question as 'front', answer as 'back'. All product questions must be grounded in documents."
    ))

    cheat_sheet: str = Field(description=(
        "A quick-reference cheat sheet in clean markdown covering: "
        "Top 5 product facts (from documents), "
        "BVD discovery sequence (4 steps), "
        "Top 5 calibrated questions for this product's buyers, "
        "Negotiator type quick-guide (Analyst/Accommodator/Assertive — one line each), "
        "DNI risk framing statement ('What does doing nothing cost you?'), "
        "Rule of Three checklist, "
        "ICP qualifier (5 yes/no questions). "
        "Max 2 pages. Structured for printing."
    ))

    youtube_videos: list[YoutubeVideo] = Field(description=(
        "Exactly 3 YouTube search queries about the PRODUCT TYPE/CATEGORY. "
        "Help engineers understand the product's working principle, applications, or selection process. "
        "Do NOT use company name in queries. Use specific product terminology from the documents."
    ))


class NegotiatorVariant(BaseModel):
    model_config = _STRICT

    negotiator_type: str = Field(description="One of: Analyst, Accommodator, or Assertive")
    opening_adjustment: str = Field(description=(
        "How to adjust the opening for this negotiator type. "
        "Analyst: lead with data and preparation signal. "
        "Accommodator: lead with relationship and shared goals. "
        "Assertive: lead with validation of their position before guiding."
    ))
    key_emphasis: str = Field(description=(
        "What to emphasize in the pitch body for this type. "
        "Analyst: specifics, comparisons, time to process. "
        "Accommodator: team impact, relationship continuity, win-win. "
        "Assertive: speed, results, competitive advantage."
    ))
    close_approach: str = Field(description=(
        "How to close with this type. "
        "Analyst: give them time; use precise numbers; warn of issues early. "
        "Accommodator: use How questions to drive from agreement to action. "
        "Assertive: let them feel they won; use Ackerman decreasing increments."
    ))


class GeneratedSalesPitch(BaseModel):
    model_config = _STRICT

    accusation_audit: list[str] = Field(description=(
        "3-5 preemptive Accusation Audit labels the SE delivers BEFORE the prospect raises any objection. "
        "Format: 'It seems like [the concern/doubt]...' "
        "Cover the most likely doubts: past bad vendor experiences, price concerns, "
        "hesitation to change, skepticism about claims, internal politics. "
        "These are stated OUT LOUD at the start of the meeting to disarm resistance."
    ))

    opening: str = Field(description=(
        "The pitch opening using Care's Beautiful Beginning (PUNCH: Personal/Unexpected/Novel/Challenge/Humor) "
        "and Voss's Accusation Audit technique. "
        "Start with the customer's world, not the product. "
        "Pre-empt the first objection. Use loss-aversion framing. "
        "Do NOT start with a corporate overview."
    ))

    key_value_props: list[str] = Field(description=(
        "5-7 value propositions, each as a complete FAB Chain: "
        "Feature (IS) → Advantage (DOES) → Benefit (MEANS to this buyer in Time/Money/People terms). "
        "Tag each with 3WM+M driver: Revenue↑ / Cost↓ / Risk / Mission. "
        "Include loss-aversion framing for at least 2: what they LOSE by not choosing this product."
    ))

    objection_responses: list[ObjectionNote] = Field(description=(
        "7-10 objection handling scripts using Voss's Accusation Audit + Calibrated Response System. "
        "For each: objection = the prospect's words; "
        "recommended_response = Accusation Audit pre-empt + What/How calibrated question + LACE close. "
        "Never split the difference on price. Never attack competitors directly. "
        "Cover: existing vendor, price too high, no budget, need to think, committee approval, "
        "gone silent, not ready, competitor comparison, bad past experience."
    ))

    closing: str = Field(description=(
        "The Fantastic Finish using Care's framework + Voss's Rule of Three. "
        "End on the single most powerful benefit (the Residual Message). "
        "Get three confirmations of commitment (direct agreement, label/summary, How implementation question). "
        "End with a How question testing real commitment: 'How are we going to make this happen on your side?' "
        "NEVER end with 'Any questions?' or 'Thank you.'"
    ))

    non_responder_email: str = Field(description=(
        "The one-sentence Voss non-responder email for when the prospect goes silent after the pitch. "
        "Must use loss-aversion and No-oriented framing. "
        "Template: 'Have you given up on [specific project/initiative from the client context]?' "
        "One sentence. No pleasantries. No pressure. Just this."
    ))

    negotiator_variants: list[NegotiatorVariant] = Field(description=(
        "Exactly 3 pitch adaptation guides — one per Voss negotiator type: "
        "Analyst (data-driven, skeptical, needs time), "
        "Accommodator (relationship-first, friendly, may over-commit), "
        "Assertive (time=money, direct, wants to win). "
        "Each variant adjusts the opening, key emphasis, and closing approach for that personality type."
    ))
