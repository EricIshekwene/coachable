import { AuthCard, Button, Checkbox, Input } from "../../../design-system/components";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSRef } from "../dsPrimitives";

/**
 * Authentication pages: the auth-card pattern, auth components, and the full
 * set of auth screens and states.
 *
 * @returns {JSX.Element}
 */
export default function AuthSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Patterns & templates"
        title="Authentication"
        lead="Auth screens are a centered card on the brand background: logo, a short heading, the form, then a single primary action and one secondary link. Errors surface as an inline alert above the form; success states confirm and redirect."
      />

      <DSGroup title="Auth card" status="spec" description="The shared shell for login, signup, and reset.">
        <DSTile>
          <AuthCard
            title="Welcome back"
            subtitle="Log in to your Coachable account."
            footer={<>New to Coachable? <span style={{ color: "var(--ui-accent)" }}>Create an account</span></>}
          >
            <Input label="Email" type="email" placeholder="coach@team.com" onChange={() => {}} />
            <Input label="Password" type="password" placeholder="••••••••" onChange={() => {}} />
            <div className="flex items-center justify-between">
              <Checkbox checked label="Remember me" onChange={() => {}} />
              <Button variant="ghost" size="sm">Forgot password?</Button>
            </div>
            <Button variant="primary" className="w-full">Log in</Button>
          </AuthCard>
        </DSTile>
      </DSGroup>

      <DSGroup title="Auth components">
        <DSChecklist
          columns={3}
          items={[
            { label: "Auth card / form", status: "inApp" },
            { label: "Password strength meter", status: "spec" },
            { label: "Terms checkbox / privacy link", status: "inApp" },
            { label: "Remember me", status: "spec" },
            { label: "Auth error / success alert", status: "inApp" },
            { label: "Email verification banner", status: "inApp" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Auth screens & states">
        <DSChecklist
          columns={3}
          items={[
            { label: "Sign up", note: "src/pages/Signup.jsx", status: "inApp" },
            { label: "Log in", note: "src/pages/Login.jsx", status: "inApp" },
            { label: "Forgot / reset password", note: "ForgotPassword / ResetPassword", status: "inApp" },
            { label: "Verify email", note: "src/pages/VerifyEmail.jsx", status: "inApp" },
            { label: "Onboarding", note: "src/pages/Onboarding.jsx", status: "inApp" },
            { label: "Invite acceptance", note: "StaffAcceptInvite.", status: "inApp" },
            { label: "Account locked / session expired", status: "spec" },
            { label: "Two-factor / recovery code", status: "planned" },
            { label: "SSO / OAuth login", status: "planned" },
          ]}
        />
        <p className="text-xs" style={{ color: "var(--adm-text3)" }}>Real auth: <DSRef>src/pages/Login.jsx</DSRef> <DSRef>src/pages/Signup.jsx</DSRef> <DSRef>src/pages/Onboarding.jsx</DSRef></p>
      </DSGroup>
    </div>
  );
}
