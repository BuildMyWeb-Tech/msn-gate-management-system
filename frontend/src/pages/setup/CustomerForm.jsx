// frontend/src/pages/setup/CustomerForm.jsx
// ✅ FIX 1: Responsive grid — gm-form-grid-2 / gm-form-grid-3 replace inline styles
//   Mobile: 1 col | Tablet: 2 col | Desktop: 3 col (for 3-col sections)

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, UserCheck } from "lucide-react";
import {
  createCustomer,
  updateCustomer,
  getCustomerById,
} from "../../services/customerService";

/* ── All Indian States + UTs ────────────────────────────────── */
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

function SectionHeader({ title }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
      color: "#818cf8", textTransform: "uppercase",
      borderBottom: "1px solid rgba(99,102,241,0.18)",
      paddingBottom: 8, marginBottom: 18, marginTop: 8,
    }}>
      {title}
    </div>
  );
}

function Field({ label, required, error, hint, children }) {
  return (
    <div className="gm-field">
      <label className="gm-label">
        {label}{required && <span className="gm-req"> *</span>}
      </label>
      {children}
      {hint  && !error && <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{hint}</div>}
      {error && <div className="gm-field-err">{error}</div>}
    </div>
  );
}

const EMPTY = {
  Pcode: "", Pname: "", Pbranch: "", Address1: "", Address2: "",
  City: "", State: "", Pincode: "", GSTNo: "", Mobile: "",
  email: "", website: "", contactperson: "", Active: 1,
};

export default function CustomerForm() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);

  const [form,     setForm]     = useState(EMPTY);
  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState(false);
  const [apiError, setApiError] = useState("");
  const [loaded,   setLoaded]   = useState(!isEdit);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getCustomerById(id);
        if (cancelled) return;
        const d = res.data;
        if (d) {
          setForm({
            Pcode:         d.Pcode         || "",
            Pname:         d.Pname         || "",
            Pbranch:       d.Pbranch       || "",
            Address1:      d.Address1      || "",
            Address2:      d.Address2      || "",
            City:          d.City          || "",
            State:         d.State         || "",
            Pincode:       d.Pincode       != null ? String(d.Pincode) : "",
            GSTNo:         d.GSTNo         || "",
            Mobile:        d.Mobile        != null ? String(d.Mobile)  : "",
            email:         d.email         || "",
            website:       d.website       || "",
            contactperson: d.contactperson || "",
            Active:        Number(d.Active ?? 1),
          });
        }
      } catch {
        if (!cancelled) setApiError("Failed to load customer details.");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.Pname.trim())   e.Pname   = "Customer name is required";
    if (!form.Pbranch.trim()) e.Pbranch = "Branch is required";
    if (form.Mobile.trim() && !/^\d{10}$/.test(form.Mobile.trim()))
      e.Mobile = "Mobile must be exactly 10 digits";
    if (form.GSTNo.trim() && form.GSTNo.trim().length !== 15)
      e.GSTNo = "GST No must be exactly 15 characters";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = "Enter a valid email address";
    if (form.Pincode.trim() && !/^\d{6}$/.test(form.Pincode.trim()))
      e.Pincode = "Pincode must be 6 digits";
    return e;
  };

  const buildPayload = () => ({
    Active: form.Active, Address1: form.Address1.trim(), Address2: form.Address2.trim(),
    City: form.City.trim(), GSTNo: form.GSTNo.trim(),
    Mobile:  form.Mobile.trim()  ? Number(form.Mobile.trim())  : null,
    Pbranch: form.Pbranch.trim(), Pcode: form.Pcode.trim(),
    Pincode: form.Pincode.trim() ? Number(form.Pincode.trim()) : null,
    Pname:   form.Pname.trim(),   State: form.State,
    contactperson: form.contactperson.trim(), country: "India",
    email: form.email.trim(), website: form.website.trim(),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    if (!loaded) return;
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      const payload = buildPayload();
      let res;
      if (isEdit) {
        res = await updateCustomer(id, payload);
      } else {
        const { Pcode, ...createPayload } = payload;
        res = await createCustomer(createPayload);
      }
      const msg = res?.message || "";
      if (msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("duplicate")) {
        setApiError(msg);
        setSaving(false);
        return;
      }
      navigate("/setup/customers", {
        state: {
          toast: {
            msg:  msg || (isEdit ? "Customer updated successfully." : "Customer created successfully."),
            type: "success",
          },
        },
      });
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || "Operation failed.");
      setSaving(false);
    }
  };

  return (
    <div className="um-form-page">
      <div className="um-form-wrap">

        {/* ── Breadcrumb ── */}
        <div className="um-breadcrumb">
          <button className="um-breadcrumb-back" onClick={() => navigate("/setup/customers")}>
            <ArrowLeft size={14} /> Customers
          </button>
          <span style={{ color: "#475569", margin: "0 6px" }}>›</span>
          <span className="um-breadcrumb-active">
            {isEdit ? "Edit Customer" : "New Customer"}
          </span>
        </div>

        {/* ── Card ── */}
        <div className="um-card">
          <div className="um-card-header">
            <div className="um-card-icon"><UserCheck size={18} /></div>
            <div>
              <div className="um-card-title">{isEdit ? "Edit Customer" : "New Customer"}</div>
              <div className="um-card-subtitle">
                {isEdit ? "Update customer details" : "Fill in the details to create a new customer"}
              </div>
            </div>
          </div>

          {isEdit && !loaded ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 0" }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{
                  height: 42, borderRadius: 8,
                  background: "rgba(255,255,255,0.05)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }} />
              ))}
              <div style={{ fontSize: 13, color: "#475569", textAlign: "center", marginTop: 4 }}>
                Loading customer details…
              </div>
            </div>
          ) : (
            <>
              {apiError && <div className="gm-modal-error">⚠ {apiError}</div>}

              <form onSubmit={handleSubmit} noValidate autoComplete="off">

                {/* ════ SECTION 1: Basic Information ════ */}
                <SectionHeader title="Basic Information" />

                {/* ✅ RESPONSIVE: gm-form-grid-2 (1 col mobile, 2 col tablet+) */}
                <div className="gm-form-grid-2">

                  {isEdit && (
                    <Field label="Code">
                      <input
                        name="Pcode" type="text" className="gm-input"
                        value={form.Pcode} readOnly
                        style={{ opacity: 0.55, cursor: "not-allowed" }}
                      />
                    </Field>
                  )}

                  <Field label="Customer Name" required error={errors.Pname}>
                    <input
                      name="Pname" type="text"
                      className={`gm-input${errors.Pname ? " error" : ""}`}
                      placeholder="Enter customer name"
                      value={form.Pname} onChange={handleChange} autoFocus={!isEdit}
                    />
                  </Field>

                  <Field label="Branch" required error={errors.Pbranch}>
                    <input
                      name="Pbranch" type="text"
                      className={`gm-input${errors.Pbranch ? " error" : ""}`}
                      placeholder="Enter branch (e.g. HO)"
                      value={form.Pbranch} onChange={handleChange}
                    />
                  </Field>

                </div>

                {/* ════ SECTION 2: Address ════ */}
                <SectionHeader title="Address" />

                <Field label="Address Line 1" error={errors.Address1}>
                  <input
                    name="Address1" type="text"
                    className={`gm-input${errors.Address1 ? " error" : ""}`}
                    placeholder="Street / door no" maxLength={200}
                    value={form.Address1} onChange={handleChange}
                  />
                </Field>

                <Field label="Address Line 2" error={errors.Address2}>
                  <input
                    name="Address2" type="text"
                    className={`gm-input${errors.Address2 ? " error" : ""}`}
                    placeholder="Landmark, area (optional)" maxLength={200}
                    value={form.Address2} onChange={handleChange}
                  />
                </Field>

                {/* ✅ RESPONSIVE: gm-form-grid-3 (1 col mobile, 2 col tablet, 3 col desktop) */}
                <div className="gm-form-grid-3">

                  <Field label="City" error={errors.City}>
                    <input
                      name="City" type="text"
                      className={`gm-input${errors.City ? " error" : ""}`}
                      placeholder="City"
                      value={form.City} onChange={handleChange}
                    />
                  </Field>

                  <Field label="State" error={errors.State}>
                    <select
                      name="State"
                      className={`gm-input${errors.State ? " error" : ""}`}
                      value={form.State} onChange={handleChange}
                      style={{ cursor: "pointer" }}
                    >
                      <option value="">— Select State —</option>
                      {INDIAN_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Pincode" error={errors.Pincode}>
                    <input
                      name="Pincode" type="text"
                      className={`gm-input${errors.Pincode ? " error" : ""}`}
                      placeholder="6-digit pincode" maxLength={6}
                      value={form.Pincode} onChange={handleChange}
                    />
                  </Field>

                </div>

                {/* Country — always India */}
                <Field label="Country">
                  <input
                    type="text" className="gm-input" value="India" readOnly
                    style={{ opacity: 0.55, cursor: "not-allowed" }}
                  />
                </Field>

                {/* ════ SECTION 3: Contact Details ════ */}
                <SectionHeader title="Contact Details" />

                {/* ✅ RESPONSIVE: gm-form-grid-2 */}
                <div className="gm-form-grid-2">

                  <Field label="Mobile" error={errors.Mobile}>
                    <input
                      name="Mobile" type="text"
                      className={`gm-input${errors.Mobile ? " error" : ""}`}
                      placeholder="10-digit mobile number" maxLength={10}
                      value={form.Mobile} onChange={handleChange}
                    />
                  </Field>

                  <Field label="Email" error={errors.email}>
                    <input
                      name="email" type="email"
                      className={`gm-input${errors.email ? " error" : ""}`}
                      placeholder="customer@example.com (optional)"
                      value={form.email} onChange={handleChange}
                    />
                  </Field>

                  <Field label="Website" error={errors.website}>
                    <input
                      name="website" type="text"
                      className={`gm-input${errors.website ? " error" : ""}`}
                      placeholder="https://example.com"
                      value={form.website} onChange={handleChange}
                    />
                  </Field>

                  <Field label="Contact Person" error={errors.contactperson}>
                    <input
                      name="contactperson" type="text"
                      className={`gm-input${errors.contactperson ? " error" : ""}`}
                      placeholder="Primary contact name"
                      value={form.contactperson} onChange={handleChange}
                    />
                  </Field>

                </div>

                {/* ════ SECTION 4: Business Information ════ */}
                <SectionHeader title="Business Information" />

                {/* ✅ RESPONSIVE: gm-form-grid-2 */}
                <div className="gm-form-grid-2">

                  <Field
                    label="GST No" error={errors.GSTNo}
                    hint={`${form.GSTNo.length}/15 characters`}
                  >
                    <input
                      name="GSTNo" type="text"
                      className={`gm-input${errors.GSTNo ? " error" : ""}`}
                      placeholder="15-character GST number" maxLength={15}
                      value={form.GSTNo} onChange={handleChange}
                      style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}
                    />
                  </Field>

                </div>

                {/* ════ SECTION 5: Status ════ */}
                <SectionHeader title="Status" />

                <div className="gm-field">
                  <label className="gm-label">Account Status</label>
                  <div className="um-radio-group">
                    <label
                      className={`um-radio-label ${form.Active === 1 ? "um-radio-label--active-sel" : ""}`}
                      onClick={() => setForm(p => ({ ...p, Active: 1 }))}
                    >
                      <span className={`um-radio-circle ${form.Active === 1 ? "um-radio-circle--active" : ""}`} />
                      Active
                    </label>
                    <label
                      className={`um-radio-label ${form.Active === 0 ? "um-radio-label--inactive-sel" : ""}`}
                      onClick={() => setForm(p => ({ ...p, Active: 0 }))}
                    >
                      <span className={`um-radio-circle ${form.Active === 0 ? "um-radio-circle--inactive" : ""}`} />
                      Inactive
                    </label>
                  </div>
                </div>

                {/* ── Actions ── */}
                <div className="um-form-actions" style={{ marginTop: 28 }}>
                  <button
                    type="button" className="gm-btn-cancel"
                    onClick={() => navigate("/setup/customers")} disabled={saving}
                  >
                    <ArrowLeft size={14} style={{ marginRight: 4 }} /> Back
                  </button>
                  <button
                    type="submit" className="gm-btn-save um-submit-btn"
                    disabled={saving || !loaded}
                  >
                    {saving ? <span className="gm-spinner-sm" /> : <Save size={14} />}
                    {isEdit ? "Save Changes" : "Create Customer"}
                  </button>
                </div>

              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}