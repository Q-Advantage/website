# Q-Advantage Methodology — v1.0

**Last updated:** 2026-05-06
**Document version:** 1.0
**Repository:** github.com/Q-Advantage/methodology
**License:** CC BY 4.0 — methodology is open. Cite when used.

---

## 0. Why this document exists

The quantum computing industry runs on press releases, embargoed analyst PDFs, and vendor-supplied performance claims. None of these are independently reproducible. None permit external verification. None survive contact with adversarial review.

Q-Advantage exists to build the missing reference layer. The premise is narrow and falsifiable: every claim we publish should be reproducible by a third party with a laptop, a free GitHub account, and this document.

This methodology defines what we measure, how we measure it, where the inputs come from, and what would prove our scoring wrong. It is intentionally written to be attacked. If you find an error, open an issue. If we agree, we update — and the change-log will record what changed and why.

---

## 1. Scope and non-goals

### What Q-Advantage measures

1. **Q-Day Index** — composite estimate of how close current quantum hardware is to defeating widely-deployed asymmetric cryptography (RSA-2048, ECC-P256). Output: a 0–10 headline score, three sub-scores, and a probability-by-year curve.
2. **Q-Shield** — empirical performance benchmarks of NIST-standardised post-quantum cryptographic algorithms on commodity hardware. Output: per-algorithm latency, throughput, and key/signature sizes, run daily.
3. **Q-Arena** — execution of canonical quantum algorithms (Shor's, Grover's, VQE) on real or simulated quantum hardware, with full transparency on circuit depth, shot count, error rate, and success probability.

### Explicit non-goals

- Q-Advantage does **not** sell consulting based on private versions of these scores. Every score is public the same day it is computed.
- Q-Advantage does **not** estimate the calendar date of "Q-Day." We estimate trajectories with explicit uncertainty bands. Anyone publishing a single-date Q-Day prediction is selling something.
- Q-Advantage does **not** evaluate symmetric cryptography (AES, SHA-2/3) against quantum threats. Symmetric primitives face only Grover-type quadratic speedups, and doubling key length is a well-understood mitigation. This is a solved problem and not where the scoring effort is best spent.
- Q-Advantage does **not** publish hardware vendor rankings as a primary output. Sub-scores per vendor exist, but the headline product is the threat trajectory, not vendor competition.

---

## 2. Q-Day Index — the threat horizon score

### 2.1 What the Index estimates

The Q-Day Index estimates the *current readiness* of publicly-known quantum hardware to execute a cryptographically relevant Shor's algorithm attack against RSA-2048 and ECC-P256, as well as the *projected trajectory* toward such readiness.

**It is not a prediction of when Q-Day will occur.** It is a measurement of how far the field has progressed along the technical axes that any successful Q-Day attack requires.

### 2.2 The three sub-scores

The Index decomposes into three independently-computed sub-scores, each on a 0–10 scale. These are then combined via a weighted formula into the headline score.

#### 2.2.1 Hardware Sub-Score (H)

Measures raw quantum hardware capability across publicly-disclosed quantum processors.

**Inputs (per system):**
- `physical_qubits` — number of physical qubits in the largest single-chip processor
- `two_qubit_gate_fidelity` — best published median 2-qubit gate fidelity (Quantum Volume reports, vendor whitepapers, peer-reviewed papers)
- `coherence_time_us` — median T2 coherence time in microseconds
- `connectivity` — qubit connectivity model: `all-to-all`, `nearest-neighbour-2D`, `heavy-hex`, `linear`
- `clock_speed_ghz` — gate operation rate

**Per-system score (0–10):**

```
H_system = w1 · log_qubit_score
         + w2 · fidelity_score
         + w3 · coherence_score
         + w4 · connectivity_score
```

Where:
- `log_qubit_score = clamp(log10(physical_qubits) / log10(20_000_000), 0, 1) · 10`
  (anchored such that 20M qubits ≈ score of 10, since 20M physical qubits at current EC overhead is the canonical estimate for breaking RSA-2048; see §2.3)
- `fidelity_score = clamp((two_qubit_gate_fidelity - 0.99) / 0.0099, 0, 1) · 10`
  (anchored such that 0.99 fidelity = 0 points, 0.9999 = 10 points; the floor is the minimum fidelity at which any cryptographically interesting circuit becomes contemplable, the ceiling is the regime in which logical qubits become practical)
- `coherence_score = clamp(log10(coherence_time_us / 100) / log10(10000 / 100), 0, 1) · 10`
  (100 µs floor, 10,000 µs ceiling)
- `connectivity_score`: all-to-all = 10, heavy-hex = 6, nearest-neighbour-2D = 5, linear = 2

**Default weights:** `w1=0.4, w2=0.4, w3=0.15, w4=0.05`

Rationale: qubit count and gate fidelity are the two binding constraints in every published Shor's-on-RSA resource estimate (Gidney & Ekerå 2021, Webber et al. 2022). Coherence and connectivity are second-order; we weight them accordingly.

The Hardware Sub-Score `H` is the **maximum** `H_system` across all tracked systems — not the average. The Q-Day threat is determined by the best available hardware on Earth, not the median.

#### 2.2.2 Error-Correction Sub-Score (E)

Measures the field's readiness to convert noisy physical qubits into reliable logical qubits — the bottleneck between today's NISQ machines and a cryptographically relevant quantum computer.

**Inputs:**
- `best_demonstrated_logical_qubit_count` — peer-reviewed result
- `best_demonstrated_logical_error_rate` — per logical operation
- `surface_code_threshold_margin` — how far below-threshold the best system operates (gate fidelity vs. surface code threshold ~0.99)
- `ec_overhead_ratio` — empirically demonstrated ratio of physical qubits required per logical qubit at the demonstrated error rate

**Computation:**

```
E = w1 · clamp(log10(logical_qubits) / log10(2330), 0, 1) · 10
  + w2 · clamp((1 - log10(logical_error_rate)) / 12, 0, 1) · 10
  + w3 · clamp(threshold_margin / 0.005, 0, 1) · 10
```

The 2330 anchor for logical qubit count derives from Gidney & Ekerå's 2021 estimate that ~2330 logical qubits at 10⁻¹² logical error rate are sufficient to factor RSA-2048 in 8 hours.

**Default weights:** `w1=0.5, w2=0.4, w3=0.1`

#### 2.2.3 Algorithmic Sub-Score (A)

Measures progress in the algorithmic side — improvements in Shor's algorithm and its variants that reduce the qubit and circuit-depth requirements for breaking RSA and ECC.

**Inputs:**
- `best_published_qubit_requirement_RSA2048` — most efficient published Shor's variant for RSA-2048
- `best_published_circuit_depth_RSA2048` — corresponding T-gate depth or surface code cycle count
- `best_published_qubit_requirement_ECC256` — for elliptic curve discrete log
- `years_since_last_significant_improvement`

**Computation:**

The Algorithmic Sub-Score is an inverse measure: as the qubit requirement *decreases*, the score *increases*, because the threat moves closer.

```
A_qubits = clamp((log10(20_000_000) - log10(best_qubit_req)) / 2, 0, 1) · 10
A_depth  = clamp((30 - log10(best_depth)) / 5, 0, 1) · 10
A = 0.6 · A_qubits + 0.4 · A_depth
```

The `years_since_last_significant_improvement` value is recorded but not directly weighted — it informs the uncertainty band, not the point estimate.

### 2.3 The headline score

```
Q-Day Index = w_H · H + w_E · E + w_A · A
```

**Default weights:** `w_H = 0.50, w_E = 0.35, w_A = 0.15`

These weights are not arbitrary. They reflect the consensus in the resource-estimation literature that hardware capability and error correction are the two limiting factors, with algorithmic improvements playing a meaningful but secondary role.

The weights are themselves a methodological choice and are open to revision. Any weight change is published as a methodology version bump (v1.0 → v1.1) with a documented rationale and the recomputation of all historical scores under both old and new weights.

### 2.4 Anchoring the 0–10 scale

A score of **0** means: no quantum hardware in existence today poses any meaningful threat to RSA-2048 or ECC-P256 — the equivalent of a system that cannot run a 4-qubit circuit reliably.

A score of **10** means: a quantum system has been independently demonstrated to factor a 2048-bit RSA modulus in under 24 hours, with error rates and reliability sufficient that the result is reproducible and the underlying capability is generalisable.

A score of **5** is anchored to: a system that has demonstrated either (a) enough logical qubits at sufficient fidelity to factor an RSA-512 modulus in finite time, or (b) the equivalent capability across the H, E, and A sub-scores.

The mid-scale is necessarily fuzzy because no system has demonstrated capabilities in this regime. As publicly verifiable demonstrations occur, anchor points will be updated and historical scores recomputed.

### 2.5 The probability-by-year output

In addition to the headline score, the Index publishes a probability curve estimating the likelihood of a cryptographically relevant quantum computer existing by year Y for Y ∈ {2030, 2033, 2035, 2040}.

This curve is computed by:

1. Taking the H, E, and A sub-scores at each historical month since tracking began
2. Fitting an exponential trend with explicit uncertainty bands using historical doubling-time analyses (Quantum Volume doublings every ~12 months 2018–2024; logical qubit count doublings every ~24 months 2020–2026)
3. Projecting forward with the uncertainty band widening linearly with time
4. Computing the probability that the projected H, E, and A sub-scores exceed the score-of-10 thresholds by year Y

The probability curve is the single most uncertain output Q-Advantage produces. We publish it because the audience of CISOs and investors needs *some* probabilistic input to plan around, but we are explicit: this curve is a model output with wide uncertainty, not a forecast.

### 2.6 Data sources and update cadence

**Primary sources, in order of preference:**

1. Peer-reviewed publications (Nature, Science, Physical Review)
2. Vendor technical whitepapers with reproducible methodology
3. Conference proceedings (Q2B, IEEE Quantum Week)
4. Vendor press releases with verifiable technical claims (claims without specs are excluded)
5. Public demonstration runs on cloud-quantum platforms (AWS Braket, IBM Quantum, Azure Quantum)

**Excluded sources:**

- Vendor marketing material without technical specifications
- Roadmap announcements (these document intent, not capability)
- Embargoed analyst reports
- Self-reported numbers without an independent reproduction path

**Update cadence:**

- The underlying `quantum_hardware.json` data file is reviewed monthly and updated when verifiable new specs are published.
- The Index recomputes automatically on every data file change.
- Major vendor announcements trigger an out-of-cycle review within 7 days.

### 2.7 What would falsify this Index

A Q-Day Index methodology is only useful if it can be wrong in identifiable ways. The Index would be considered falsified if any of the following occurred:

- A reproducible RSA-2048 factorisation occurred while the Index was below 5
- A reproducible RSA-2048 factorisation did not occur by 2050 while the Index trended above 8 sustained for 24 months
- The weights were demonstrated by independent statistical analysis to systematically bias against a specific hardware approach (e.g. trapped-ion vs. superconducting)

In each case, the methodology version would be retired with a published post-mortem.

---

## 3. Q-Shield — PQC benchmark protocol

### 3.1 Algorithm scope (v1)

Q-Shield v1.0 benchmarks the NIST-standardised post-quantum algorithms exclusively:

| Algorithm | Standard | Purpose |
|---|---|---|
| ML-KEM-512 | FIPS 203 | Key encapsulation (Kyber) |
| ML-KEM-768 | FIPS 203 | Key encapsulation |
| ML-KEM-1024 | FIPS 203 | Key encapsulation |
| ML-DSA-44 | FIPS 204 | Digital signatures (Dilithium) |
| ML-DSA-65 | FIPS 204 | Digital signatures |
| ML-DSA-87 | FIPS 204 | Digital signatures |
| SLH-DSA-SHAKE-128s | FIPS 205 | Hash-based signatures (SPHINCS+) |

Future versions will expand to include HQC, Falcon, and round-4 candidates. The narrow v1 scope is deliberate: defending a small benchmark is easier than defending a broad one, and credibility compounds.

### 3.2 Test environment

**Hardware (v1 reference machine):**

- AWS EC2 `t3.medium` instance (2 vCPU Intel Xeon Platinum 8000-series, 4 GiB RAM)
- Ubuntu 22.04 LTS
- No competing workloads at benchmark time

The exact CPU model, kernel version, and microcode revision are recorded in every `results.json` output. When the underlying AWS instance type changes (e.g., due to AWS hardware refresh), this is recorded as an environmental change in the change-log and a comparison run is published.

**Software stack:**

- liboqs (Open Quantum Safe) — version pinned per run, recorded in output
- liboqs-python bindings
- Python 3.11+
- glibc and OpenSSL versions recorded per run

### 3.3 Measurement protocol

For each algorithm in scope:

1. **Warm-up:** 100 throwaway iterations to eliminate cold-cache effects.
2. **Measurement:** 1,000 iterations of each operation (`keygen`, `encap`/`decap` for KEMs, `sign`/`verify` for signatures).
3. **Recorded per operation:**
   - Mean latency (microseconds)
   - Standard deviation
   - p50, p95, p99 latencies
   - Operations per second (derived)
   - Public key size (bytes)
   - Private key size (bytes)
   - Ciphertext or signature size (bytes)
4. **System metadata recorded:**
   - ISO 8601 timestamp of run start
   - Full CPU model from `/proc/cpuinfo`
   - Python version
   - liboqs version
   - Git commit hash of benchmark.py
   - GitHub Actions run ID (links to public log)

Output formats:
- `results.json` — machine-readable, full result set
- `RESULTS.md` — human-readable markdown table
- Both committed to the public repo at the end of every run.

### 3.4 Run cadence

Q-Shield benchmarks run **daily** at 00:00 UTC via GitHub Actions cron, with manual trigger also available. The results commit to the repo automatically with a signed commit from a dedicated GitHub Actions identity.

A 30-day rolling history is plotted on the Q-Shield dashboard. Older results remain in the repository indefinitely.

### 3.5 What we do not claim

- **We do not claim our benchmark machine is representative of all production environments.** Performance scales differently on ARM, on enclave hardware, on embedded systems. Q-Shield publishes one carefully-controlled reference number; users with specific deployment targets should run the benchmark themselves on their target hardware.
- **We do not claim ours is the fastest implementation.** liboqs is a research-grade implementation. Production systems may use AWS-LC, BoringSSL, or hardware-accelerated variants that perform meaningfully better.
- **We do not interpret the numbers as security claims.** All algorithms benchmarked are NIST-standardised at their respective security levels. Performance is not a security metric.

### 3.6 Reproducibility contract

Every Q-Shield result satisfies the following contract:

1. The benchmark source code is in the public repository at the commit hash recorded in the result.
2. The GitHub Actions workflow file is publicly readable.
3. The full Actions log of the run is publicly readable.
4. A third party can clone the repo, check out the commit, and run the benchmark on equivalent hardware to produce results within ±10% of the published numbers.

Any result that fails this contract is retracted from the dataset with a public note.

---

## 4. Q-Arena — quantum algorithm execution

### 4.1 Algorithms in scope (v1)

Q-Arena v1.0 executes three canonical quantum algorithms:

- **Shor's algorithm** — factoring small integers (15, 21, 35) for educational and benchmarking value
- **Grover's algorithm** — unstructured search over small databases (4-bit, 6-bit problem sizes)
- **VQE (Variational Quantum Eigensolver)** — H₂ molecule ground state energy

All three are public, well-understood reference algorithms. None pose any cryptographic threat at the problem sizes Q-Arena executes.

### 4.2 Hardware vs. simulator labelling

Every Q-Arena result is unambiguously labelled with one of:

- `simulator-local` — local Python simulator (e.g. Qiskit Aer, Braket LocalSimulator)
- `simulator-cloud` — cloud-managed simulator (e.g. AWS SV1, IBM Aer cloud)
- `hardware-{vendor}-{system_name}` — real quantum hardware (e.g. `hardware-ibm-eagle-r3`, `hardware-ionq-aria-1`)

**Simulator results are never reported as "quantum advantage."** They are reported as algorithmic correctness verification only.

The labelling convention is enforced by the result schema and by code review on every commit. Any result with ambiguous or missing hardware labelling is rejected at the workflow level.

### 4.3 Recorded per-run

For every Q-Arena execution:

- Algorithm name and problem instance (e.g. `Shor-factoring-N=15`)
- Hardware/simulator identifier (per §4.2)
- Circuit depth (gate count, T-gate count where applicable)
- Number of shots
- Wall-clock execution time
- Success rate (percentage of shots returning the correct answer)
- Full measurement histogram
- Cost (USD) — for cloud runs; this is a useful transparency signal
- Vendor-side metadata where available (queue time, calibration timestamp)

### 4.4 Statistical floor

Q-Arena does not publish a single-shot result as a benchmark. Each algorithm execution runs at minimum **100 shots** for simulator runs and **1,000 shots** for hardware runs. Single-shot demonstrations are clearly tagged as `demo`, not `benchmark`.

---

## 5. Versioning and change-log discipline

### 5.1 Methodology versioning

This document follows semantic versioning:

- **MAJOR** (v1 → v2): a change to the structure of what is measured (e.g., adding a new sub-score, removing an algorithm from scope)
- **MINOR** (v1.0 → v1.1): a change to weights, anchors, or measurement parameters that affects scoring outputs but not structure
- **PATCH** (v1.0.0 → v1.0.1): clarifications, typo fixes, citation additions that do not affect any output

### 5.2 Historical recomputation

When weights or anchors change, all historical Index values are recomputed under the new methodology and republished alongside the original values. Both series are preserved in the dataset. No score is silently revised.

### 5.3 Change-log

Every methodology change is recorded in `CHANGELOG.md` in the methodology repository, with:
- Version number
- Date
- What changed
- Why
- Who proposed the change (GitHub issue link)
- What discussion preceded the merge

### 5.4 External review

Q-Advantage commits to:

- Responding to all substantive methodology issues opened on GitHub within 14 days
- Publishing an annual external review by an independent cryptographer or quantum researcher
- Preserving all prior versions of this document indefinitely so historical results can be interpreted in their original methodological context

---

## 6. Conflicts of interest

### 6.1 Funding

Q-Advantage's funding sources are publicly disclosed at `qadvantage.io/about`. As of v1.0:

- The project is bootstrapped by the founder.
- No quantum hardware vendor has funded, sponsored, or otherwise materially supported Q-Advantage.
- No vendor has been given pre-publication access to scores or methodology changes.

If this changes — at any point — the disclosure page is updated within 7 days and the change is announced in the next briefing.

### 6.2 Vendor relationships

Q-Advantage will, over time, develop relationships with quantum hardware vendors for the practical purpose of running Q-Arena benchmarks on their hardware. These relationships are bounded by the following rules:

- **No NDAs.** Q-Advantage does not sign non-disclosure agreements with any vendor whose systems we benchmark.
- **No embargoed access to results.** All results are public the same day they are computed.
- **No compensated reviews.** Vendors do not pay to be benchmarked, and Q-Advantage does not pay vendors for hardware access beyond standard public cloud rates.
- **Right of reply, not right of approval.** Vendors are notified before scoring changes and may submit factual corrections to the underlying data. They do not have the ability to approve, delay, or block publication.

---

## 7. References

The methodology draws on, and where appropriate cites, the following primary sources:

1. **NIST FIPS 203** — Module-Lattice-Based Key-Encapsulation Mechanism Standard (2024)
2. **NIST FIPS 204** — Module-Lattice-Based Digital Signature Standard (2024)
3. **NIST FIPS 205** — Stateless Hash-Based Digital Signature Standard (2024)
4. Gidney, C. & Ekerå, M. (2021). *How to factor 2048 bit RSA integers in 8 hours using 20 million noisy qubits*. Quantum, 5, 433.
5. Webber, M. et al. (2022). *The impact of hardware specifications on reaching quantum advantage in the fault tolerant regime*. AVS Quantum Science.
6. Open Quantum Safe project — liboqs library and benchmarking conventions.
7. NIST PQC Project — round 3 and round 4 evaluation reports.

A full bibliography with DOIs is maintained at `/docs/REFERENCES.md` in the methodology repository.

---

## 8. Contact

- Methodology questions: open a GitHub issue at `github.com/Q-Advantage/methodology`
- Data corrections: open a GitHub issue with the `data-correction` label
- General contact: `hello@qadvantage.io`

This document is reviewed at minimum annually. The next scheduled review is 2027-05-06.

---

*Q-Advantage is the intelligence layer for the quantum era. The quantum industry runs on press releases and analyst PDFs. Q-Advantage runs on GitHub Actions logs.*
