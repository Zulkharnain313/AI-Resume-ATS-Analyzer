
import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import "./App.css";

const API_URL = "https://ai-resume-ats-analyzer-xan2.onrender.com";

function ScoreCard({ title, score, description, type }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));

  return (
    <div className={`score-card ${type}`}>
      <div className="score-card-top">
        <span className="score-label">{title}</span>
        <span className="score-icon">
          {type === "ats" ? "◉" : type === "skills" ? "✓" : "✦"}
        </span>
      </div>

      <div className="score-value">
        {value}<span>%</span>
      </div>

      <div
        className="score-track"
        role="progressbar"
        aria-label={title}
        aria-valuenow={value}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div className="score-fill" style={{ width: `${value}%` }} />
      </div>

      <p className="score-description">{description}</p>
    </div>
  );
}

function SkillSection({ title, skills, variant, emptyMessage }) {
  const items = Array.isArray(skills) ? skills : [];

  return (
    <section className="result-panel">
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          <p>{items.length} {items.length === 1 ? "skill" : "skills"}</p>
        </div>

        <span className={`count-badge ${variant}`}>{items.length}</span>
      </div>

      {items.length > 0 ? (
        <div className="skill-list">
          {items.map((skill, index) => (
            <span
              className={`skill-tag ${variant}`}
              key={`${skill}-${index}`}
            >
              <span aria-hidden="true">
                {variant === "matched" ? "✓" : "!"}
              </span>
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <p className="empty-message">{emptyMessage}</p>
      )}
    </section>
  );
}

function App() {
  const [file, setFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  // Create and clean up the temporary URL used by the PDF preview.
  useEffect(() => {
    if (!file) {
      setPdfUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPdfUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(selectedFile) {
    setError("");
    setResult(null);

    if (!selectedFile) return;

    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("Please select a resume in PDF format.");
      return;
    }

    setFile(selectedFile);
  }

  async function analyzeResume(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!file) {
      setError("Please upload your resume in PDF format.");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please enter the job description.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("job_description", jobDescription.trim());

      const response = await fetch(`${API_URL}/analyze-pdf`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            `Analysis failed (HTTP ${response.status}).`
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the analyzer. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const recommendations = Array.isArray(result?.recommendations)
    ? result.recommendations
    : Array.isArray(result?.ai_analysis?.recommendations)
      ? result.ai_analysis.recommendations
      : [];

  const atsScore = Number(result?.ats_score) || 0;
  const skillScore = Number(result?.skill_match_score) || 0;

  const semanticScore =
    Number(result?.semantic_score) ||
    Math.round((Number(result?.semantic_similarity) || 0) * 100);

  // Generate a dashboard-style PDF report.
  function downloadReport() {
    if (!result) return;

    try {
      const doc = new jsPDF("p", "mm", "a4");

      const W = 210;
      const H = 297;
      const M = 14;
      const CW = W - M * 2;

      const C = {
        navy: [22, 32, 58],
        purple: [91, 76, 219],
        blue: [53, 120, 229],
        green: [22, 163, 106],
        red: [220, 70, 78],
        ink: [40, 48, 65],
        muted: [112, 120, 138],
        line: [226, 230, 239],
        light: [246, 248, 252],
        white: [255, 255, 255],
      };

      const filename = result.filename || file?.name || "Resume";

      const matched = Array.isArray(result.matched_skills)
        ? result.matched_skills
        : [];

      const missing = Array.isArray(result.missing_skills)
        ? result.missing_skills
        : [];

      const scoreCards = [
        { label: "ATS SCORE", value: atsScore, color: C.purple },
        { label: "SKILL MATCH", value: skillScore, color: C.green },
        { label: "SEMANTIC SCORE", value: semanticScore, color: C.blue },
      ];

      let y = 0;

      function writeText(value, x, yPos, size = 9, color = C.ink, bold = false) {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        doc.setTextColor(...color);
        doc.text(String(value ?? ""), x, yPos);
      }

      function writeWrapped(value, x, yPos, width, size = 9, color = C.ink) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(size);
        doc.setTextColor(...color);

        const lines = doc.splitTextToSize(String(value ?? ""), width);
        doc.text(lines, x, yPos);

        return lines.length * (size * 0.42 + 1.5);
      }

      function card(x, yPos, width, height, fill = C.white) {
        doc.setDrawColor(...C.line);
        doc.setFillColor(...fill);
        doc.roundedRect(x, yPos, width, height, 3, 3, "FD");
      }

      function bar(x, yPos, width, value, color) {
        const percentage = Math.max(0, Math.min(100, Number(value) || 0));

        doc.setFillColor(...C.line);
        doc.roundedRect(x, yPos, width, 3, 1.5, 1.5, "F");

        if (percentage > 0) {
          doc.setFillColor(...color);
          doc.roundedRect(
            x,
            yPos,
            Math.max(1, (width * percentage) / 100),
            3,
            1.5,
            1.5,
            "F"
          );
        }
      }

      function heading(label, x, yPos, color = C.ink) {
        writeText(label, x, yPos, 11, color, true);
      }

      // PAGE 1: DASHBOARD HEADER
      doc.setFillColor(...C.navy);
      doc.rect(0, 0, W, 51, "F");

      doc.setFillColor(...C.purple);
      doc.roundedRect(M, 12, 12, 12, 3, 3, "F");

      writeText("R", M + 4, 20.2, 13, C.white, true);
      writeText("ResumeIQ", M + 16, 17, 17, C.white, true);
      writeText(
        "RESUME ANALYTICS REPORT",
        M + 16,
        24,
        7.5,
        [205, 211, 231]
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...C.white);
      doc.text("PERSONAL REPORT", W - M, 16, { align: "right" });
      doc.text(
        `Generated: ${new Date().toLocaleDateString()}`,
        W - M,
        23,
        { align: "right" }
      );

      const headerFilename = doc.splitTextToSize(filename, CW - 4);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...C.white);
      doc.text(headerFilename.slice(0, 2), M, 39);

      writeText(
        `Analysis ID: ${result.id != null ? result.id : "N/A"}`,
        M,
        46,
        7.5,
        [205, 211, 231]
      );

      // PERFORMANCE SCORE CARDS
      heading("YOUR PERFORMANCE", M, 62);
      writeText("Resume match overview", M, 68, 8, C.muted);

      const gap = 4;
      const cardW = (CW - gap * 2) / 3;
      const cardY = 74;
      const cardH = 38;

      scoreCards.forEach((item, index) => {
        const x = M + index * (cardW + gap);

        card(x, cardY, cardW, cardH);
        writeText(item.label, x + 4, cardY + 9, 6.5, C.muted, true);
        writeText(`${item.value}%`, x + 4, cardY + 22, 18, item.color, true);
        bar(x + 4, cardY + 29, cardW - 8, item.value, item.color);
      });

      // SKILL PANELS
      heading("SKILL MATCH OVERVIEW", M, 126);
      writeText(
        `${matched.length} matched  |  ${missing.length} to improve`,
        M,
        132,
        8,
        C.muted
      );

      const panelY = 138;
      const panelGap = 5;
      const panelW = (CW - panelGap) / 2;
      const panelH = 48;
      const rightX = M + panelW + panelGap;

      card(M, panelY, panelW, panelH, [248, 253, 250]);
      doc.setFillColor(...C.green);
      doc.roundedRect(M + 4, panelY + 5, 2, 7, 1, 1, "F");

      heading("MATCHED SKILLS", M + 9, panelY + 10, C.green);

      let skillY = panelY + 19;

      if (matched.length) {
        matched.slice(0, 5).forEach((skill) => {
          writeText(`+  ${skill}`, M + 5, skillY, 8);
          skillY += 6;
        });

        if (matched.length > 5) {
          writeText(`+ ${matched.length - 5} more`, M + 5, skillY, 7, C.muted);
        }
      } else {
        writeWrapped("No matching skills found.", M + 5, skillY, panelW - 10, 8);
      }

      card(rightX, panelY, panelW, panelH, [255, 250, 250]);
      doc.setFillColor(...C.red);
      doc.roundedRect(rightX + 4, panelY + 5, 2, 7, 1, 1, "F");

      heading("SKILLS TO IMPROVE", rightX + 9, panelY + 10, C.red);

      skillY = panelY + 19;

      if (missing.length) {
        missing.slice(0, 5).forEach((skill) => {
          writeText(`!  ${skill}`, rightX + 5, skillY, 8);
          skillY += 6;
        });

        if (missing.length > 5) {
          writeText(`+ ${missing.length - 5} more`, rightX + 5, skillY, 7, C.muted);
        }
      } else {
        writeWrapped(
          "No missing skills identified.",
          rightX + 5,
          skillY,
          panelW - 10,
          8
        );
      }

      // SCORE BREAKDOWN
      heading("SCORE BREAKDOWN", M, 200);
      card(M, 206, CW, 36);

      const breakdown = [
        { label: "ATS compatibility", value: atsScore, color: C.purple },
        { label: "Required skill match", value: skillScore, color: C.green },
        { label: "Semantic similarity", value: semanticScore, color: C.blue },
      ];

      breakdown.forEach((item, index) => {
        const rowY = 215 + index * 9;

        writeText(item.label, M + 5, rowY, 8);
        bar(M + 65, rowY - 2.5, 82, item.value, item.color);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...item.color);
        doc.text(`${item.value}%`, W - M - 5, rowY, { align: "right" });
      });

      // AI RECOMMENDATIONS
      heading("AI ACTION PLAN", M, 254);
      writeText(
        "Suggested steps to strengthen your profile",
        M,
        260,
        8,
        C.muted
      );

      let recY = 270;
      const recBottom = 282;

      if (recommendations.length) {
        recommendations.forEach((recommendation, index) => {
          const lines = doc.splitTextToSize(
            String(recommendation),
            CW - 18
          );

          const blockHeight = Math.max(10, lines.length * 4 + 4);

          if (recY + blockHeight > recBottom) {
            doc.addPage();
            recY = 20;

            doc.setFillColor(...C.navy);
            doc.rect(0, 0, W, 16, "F");
            writeText(
              "ResumeIQ | AI ACTION PLAN — CONTINUED",
              M,
              10,
              9,
              C.white,
              true
            );

            recY = 25;
          }

          doc.setFillColor(...C.light);
          doc.roundedRect(M, recY - 4, CW, blockHeight, 2, 2, "F");

          doc.setFillColor(...C.purple);
          doc.circle(M + 5, recY + 1, 2.5, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(...C.white);
          doc.text(String(index + 1), M + 5, recY + 2.1, {
            align: "center",
          });

          const actualHeight = writeWrapped(
            recommendation,
            M + 11,
            recY + 1,
            CW - 16,
            8
          );

          recY += Math.max(blockHeight, actualHeight + 4);
        });
      } else {
        writeText("No recommendations were returned.", M, recY, 8, C.muted);
      }

      // PAGE 2: FULL DETAILS
      doc.addPage();

      doc.setFillColor(...C.navy);
      doc.rect(0, 0, W, 25, "F");
      writeText("ResumeIQ | ANALYSIS DETAILS", M, 15, 13, C.white, true);

      y = 39;

      heading("JOB DESCRIPTION", M, y);
      y += 8;

      y += writeWrapped(
        jobDescription.trim() || "Not provided.",
        M,
        y,
        CW,
        9
      ) + 12;

      heading("REPORT SUMMARY", M, y);
      y += 8;

      const summaryLines = [
        `Resume file: ${filename}`,
        `Analysis ID: ${result.id != null ? result.id : "N/A"}`,
        `ATS score: ${atsScore}%`,
        `Skill match: ${skillScore}%`,
        `Semantic score: ${semanticScore}%`,
        `Matched skills: ${matched.length ? matched.join(", ") : "None"}`,
        `Skills to improve: ${missing.length ? missing.join(", ") : "None identified"}`,
      ];

      summaryLines.forEach((line) => {
        const height = writeWrapped(line, M, y, CW, 9);
        y += height + 3;

        if (y > H - 28) {
          doc.addPage();
          y = 22;
        }
      });

      y += 8;

      if (y > H - 28) {
        doc.addPage();
        y = 22;
      }

      writeWrapped(
        "Disclaimer: These scores are guidance only and do not guarantee job selection. Only include skills on your resume that you genuinely have or can demonstrate.",
        M,
        y,
        CW,
        8,
        C.muted
      );

      // Add page numbers and footer to every page.
      const totalPages = doc.getNumberOfPages();

      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page);
        doc.setDrawColor(...C.line);
        doc.line(M, H - 12, W - M, H - 12);

        writeText("ResumeIQ | Resume Analysis", M, H - 7, 7, C.muted);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...C.muted);
        doc.text(`Page ${page} of ${totalPages}`, W - M, H - 7, {
          align: "right",
        });
      }

      const safeName = filename
        .replace(/\.pdf$/i, "")
        .replace(/[^a-z0-9_-]/gi, "_")
        .slice(0, 70);

      doc.save(`ResumeIQ_Dashboard_${safeName}.pdf`);
    } catch (err) {
      console.error("PDF report generation failed:", err);
      setError("Unable to generate the dashboard PDF. Please try again.");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="ResumeIQ home">
          <span className="brand-mark">A</span>
          <span>
            Resume<span className="brand-highlight">IQ</span>
          </span>
        </a>

        <span className="topbar-status">
          <span className="status-dot" />
          AI Resume Analyzer
        </span>
      </header>

      <main className="dashboard" id="home">
        <section className="hero">
          <span className="eyebrow">SMART CAREER TOOLS</span>

          <h1>
            Know your resume&apos;s <span>strength.</span>
          </h1>

          <p>
            Compare your resume against a job description, identify skill gaps,
            and get actionable recommendations to improve your match.
          </p>
        </section>

        <section className="workspace">
          <div className="section-title">
            <div className="step-number">01</div>
            <div>
              <h2>Analyze your resume</h2>
              <p>Upload your resume and add the job you want.</p>
            </div>
          </div>

          <form onSubmit={analyzeResume} className="analyzer-form">
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="resume-file">Your resume</label>

                <label
                  htmlFor="resume-file"
                  className={`upload-zone ${dragging ? "dragging" : ""} ${
                    file ? "has-file" : ""
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    selectFile(event.dataTransfer.files?.[0]);
                  }}
                >
                  <input
                    id="resume-file"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(event) => {
                      selectFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />

                  <span className="upload-icon">{file ? "✓" : "↑"}</span>

                  <strong>
                    {file ? file.name : "Choose a PDF or drop it here"}
                  </strong>

                  <span className="upload-help">
                    {file
                      ? `${(file.size / 1024).toFixed(0)} KB · Ready to analyze`
                      : "PDF format only"}
                  </span>

                  {file && (
                    <span className="change-file">Choose another file</span>
                  )}
                </label>
              </div>

              <div className="form-field">
                <label htmlFor="job-description">Job description</label>

                <textarea
                  id="job-description"
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="Paste the job description here, including required skills, experience, and qualifications..."
                  rows={8}
                />

                <span className="field-hint">
                  {jobDescription.trim().length} characters
                </span>
              </div>

              <div className="form-field preview-field">
                <label htmlFor="resume-preview">View uploaded resume</label>

                <div className="pdf-preview-box">
                  {pdfUrl ? (
                    <>
                      <div className="pdf-preview-toolbar">
                        <span>PDF Preview</span>

                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open full size ↗
                        </a>
                      </div>

                      <iframe
                        id="resume-preview"
                        className="pdf-frame"
                        src={`${pdfUrl}#toolbar=1&navpanes=0`}
                        title="Uploaded resume PDF preview"
                      />
                    </>
                  ) : (
                    <div className="pdf-empty">
                      <span className="pdf-empty-icon">PDF</span>
                      <strong>Your resume will appear here</strong>
                      <p>
                        Upload a PDF in the first box to preview it
                        automatically.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="error-message" role="alert">
                <span>!</span>
                {error}
              </div>
            )}

            <button
              className="analyze-button"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Analyzing your resume...
                </>
              ) : (
                <>
                  Analyze Resume <span aria-hidden="true">→</span>
                </>
              )}
            </button>

            {loading && (
              <p className="loading-note">
                Analysis may take a little while while the service starts and
                processes your resume.
              </p>
            )}
          </form>
        </section>

        {result && (
          <section className="results-section" aria-live="polite">
            <div className="section-title results-title">
              <div className="step-number">02</div>
              <div>
                <h2>Analysis results</h2>
                <p>
                  Here is how your resume compares with the job description.
                </p>
              </div>
            </div>

            <div className="result-file">
              <span className="file-icon">PDF</span>

              <div className="result-file-info">
                <strong>{result.filename || file?.name || "Resume"}</strong>
                <span>Analysis completed</span>
              </div>

              {result.id != null && (
                <span className="analysis-id">ID #{result.id}</span>
              )}
            </div>

            <div className="score-grid">
              <ScoreCard
                title="ATS Score"
                score={atsScore}
                description="Overall resume match"
                type="ats"
              />

              <ScoreCard
                title="Skill Match"
                score={skillScore}
                description="Required skills found"
                type="skills"
              />

              <ScoreCard
                title="Semantic Score"
                score={semanticScore}
                description="Content similarity"
                type="semantic"
              />
            </div>

            <div className="skills-grid">
              <SkillSection
                title="Matched skills"
                skills={result.matched_skills}
                variant="matched"
                emptyMessage="No matching skills found."
              />

              <SkillSection
                title="Skills to improve"
                skills={result.missing_skills}
                variant="missing"
                emptyMessage="No missing skills identified."
              />
            </div>

            <section className="recommendations-panel">
              <div className="panel-heading">
                <div>
                  <h3>AI recommendations</h3>
                  <p>Suggested next steps to strengthen your resume.</p>
                </div>

                <span className="recommendation-icon">✦</span>
              </div>

              {recommendations.length > 0 ? (
                <div className="recommendation-list">
                  {recommendations.map((recommendation, index) => (
                    <div
                      className="recommendation-item"
                      key={`${index}-${recommendation}`}
                    >
                      <span className="recommendation-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p>{recommendation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-message">
                  No recommendations were returned for this analysis.
                </p>
              )}
            </section>

            <button
              className="download-button"
              type="button"
              onClick={downloadReport}
            >
              <span aria-hidden="true">↓</span>
              Download Dashboard PDF
            </button>

            <p className="results-disclaimer">
              Use these scores as guidance, not as a guarantee of selection.
              Only add skills to your resume that you genuinely have or can
              demonstrate.
            </p>

            <button
              className="reset-button"
              type="button"
              onClick={() => {
                setResult(null);
                setError("");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              ↑ Analyze another resume
            </button>
          </section>
        )}

        <footer className="footer">
          <span className="footer-brand">ResumeIQ</span>
          <span>Built to help you prepare for your next opportunity.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
