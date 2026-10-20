import { createFileRoute } from "@tanstack/react-router"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { DocArticle } from "@/components/DocArticle"
import { PropsTable } from "@/components/PropsTable"
import { A, C, H2, H3, Li, Ol, P, Term, Ul } from "@/components/prose"

export const Route = createFileRoute("/docs/resource-view/authentication-jwt")({
  head: () => ({
    meta: [
      { title: "Authentication with JWT — react-resource-view" },
      {
        name: "description",
        content:
          "Protecting a scope on an API Platform back end: LexikJWT and a refresh token on the Symfony side, react-jwt-session on the front end — scope authorization, sign-in redirect, roles and sign-out.",
      },
    ],
  }),
  component: AuthenticationJwt,
})

const LEXIK = `lexik_jwt_authentication:
    secret_key: '%env(resolve:JWT_SECRET_KEY)%'
    public_key: '%env(resolve:JWT_PUBLIC_KEY)%'
    pass_phrase: '%env(JWT_PASSPHRASE)%'
    # A JWT cannot be revoked: keep it short-lived, the refresh token keeps the session.
    token_ttl: 3600`

const ROUTES = `api_auth:
    path: /api/auth
    methods: [POST]`

const SECURITY = `security:
    firewalls:
        main:
            pattern: ^/api
            stateless: true
            provider: users
            jwt: ~
            # POST /api/auth { email, password } → { token }
            json_login:
                check_path: api_auth
                username_path: email
                password_path: password
                success_handler: lexik_jwt_authentication.handler.authentication_success
                failure_handler: lexik_jwt_authentication.handler.authentication_failure
            # 5 failures per minute for one IP + email (needs symfony/rate-limiter).
            login_throttling:
                max_attempts: 5
                interval: '1 minute'

    access_control:
        # Signing in, renewing and signing out happen without a valid JWT.
        - { path: ^/api/auth, roles: PUBLIC_ACCESS }
        - { path: ^/api, roles: IS_AUTHENTICATED_FULLY }`

const INSTALL = `pnpm add react-jwt-session ssr-safe-storage`

const SESSION = `import { configureClient } from "jsonld-api-client"
import {
  getUserToken,
  isLogged,
  keepSessionAlive,
  setUserConfig,
  setUserToken,
  TooManyLoginAttemptsError,
  type LoginReponseInterface,
  type UserInterface,
} from "react-jwt-session"

const API_URL = "https://api.example.com"

setUserConfig({
  // POST /api/auth { email, password } → { token, refreshToken }
  authenticator: async (credentials) => {
    const response = await fetch(\`\${API_URL}/api/auth\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    })
    // login_throttling: the message says how long to wait.
    if (response.status === 429) {
      throw new TooManyLoginAttemptsError((await response.json()).message)
    }
    if (!response.ok) throw new Error("Invalid credentials.")

    const tokens: LoginReponseInterface = await response.json()
    setUserToken(tokens)
    return tokens
  },

  // The signed-in user, fetched once the token is stored.
  getUser: async () => {
    const response = await fetch(\`\${API_URL}/api/me\`, {
      headers: { Authorization: \`Bearer \${getUserToken()}\` },
    })
    return response.ok ? ((await response.json()) as UserInterface) : undefined
  },

  // A new session: start renewing it.
  onLoginSuccess: async () => {
    void keepSessionAlive()
  },

  // POST { refreshToken } → { token, refreshToken }
  refreshUrl: \`\${API_URL}/api/auth/refresh\`,
  // POST { refreshToken }, on logout()
  logoutUrl: \`\${API_URL}/api/auth/logout\`,
})

// Every request of the views carries the JWT.
configureClient({
  baseUrl: API_URL,
  getAuthToken: () => (isLogged() ? getUserToken() : undefined),
})`

const MAIN = `import "./session" // configures the session before anything reads it
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { keepSessionAlive, UserProvider } from "react-jwt-session"
import { App } from "./App"

// Renews the JWT before it expires, and again when the tab comes back.
void keepSessionAlive()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UserProvider>
      <App />
    </UserProvider>
  </StrictMode>
)`

const SCOPE = `import { createScopeAuthorization } from "react-jwt-session/resource-view"
import type { ScopeInterface } from "react-resource-view"
import { AdminLayout } from "react-resource-view"
import { articles } from "../resources/articles"
import { users } from "../resources/users"

export const adminScope: ScopeInterface = {
  name: "admin",
  label: "Administration",
  resources: [articles, users],
  decoratorComponent: AdminLayout,

  // No session → 401 → onUnauthorized. None of these roles → 403.
  authorization: createScopeAuthorization({ roles: ["ROLE_ADMIN", "ROLE_EDITOR"] }),
}`

const PROVIDER = `import { useRouter } from "@tanstack/react-router"
import { parseLink, ResourceViewProvider } from "react-resource-view"

export function Admin({ url }: { url: string }) {
  const router = useRouter()

  return (
    <ResourceViewProvider
      viewResourceContextParams={parseLink(url)}
      configuration={{
        scopes: {
          admin: () => import("./scopes/admin").then((m) => m.adminScope),
        },
        defaultScope: "admin",
        // No session, or one that could not be renewed: sign in, then come back.
        onUnauthorized: () =>
          router.navigate({
            to: "/login",
            search: { redirect: window.location.pathname },
          }),
        // While loadSession() resolves — a renewal may be under way.
        authorizationFallback: <p>Checking your session…</p>,
        // Signed in, but without any of the scope's roles.
        forbiddenFallback: <p>This area is for administrators.</p>,
      }}
    />
  )
}`

const LOGIN = `import { createFileRoute, useRouter } from "@tanstack/react-router"
import { type FormEvent, useState } from "react"
import { TooManyLoginAttemptsError, useUserContext } from "react-jwt-session"

export const Route = createFileRoute("/login")({
  // ?redirect=/admin/articles — set by onUnauthorized.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect } = Route.useSearch()
  const router = useRouter()
  const { authenticator } = useUserContext()
  const [error, setError] = useState<string>()

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      // Stores the tokens, loads the user, then runs onLoginSuccess.
      await authenticator({
        email: String(form.get("email")),
        password: String(form.get("password")),
      })
    } catch (e) {
      return setError(
        e instanceof TooManyLoginAttemptsError ? e.message : "Wrong email or password."
      )
    }
    router.navigate({ to: redirect ?? "/admin" })
  }

  return (
    <form onSubmit={onSubmit}>
      <input name="email" type="email" autoComplete="username" required />
      <input name="password" type="password" autoComplete="current-password" required />
      {error && <p role="alert">{error}</p>}
      <button type="submit">Sign in</button>
    </form>
  )
}`

const LOAD_SESSION = `import { loadSession } from "react-jwt-session"

const session = await loadSession()
// { user, roles, token } — or null when nobody is signed in
session?.roles.includes("ROLE_ADMIN")`

const FLAGS = `import { hasRole } from "react-jwt-session"
import { createViewResource } from "react-resource-view"

export const articles = createViewResource("articles", {
  path: "/api/articles",
  // Everything is allowed by default: only the restrictions are written.
  permissions: {
    create: () => hasRole("ROLE_EDITOR") || hasRole("ROLE_ADMIN"),
    update: () => hasRole("ROLE_EDITOR") || hasRole("ROLE_ADMIN"),
    delete: () => hasRole("ROLE_ADMIN"),
  },
})`

const MENU = `import { hasRole } from "react-jwt-session"
import { createScopeAuthorization } from "react-jwt-session/resource-view"
import type { ScopeInterface } from "react-resource-view"
import { AdminLayout, createItemMenuWithResource } from "react-resource-view"
import { articles } from "../resources/articles"
import { users } from "../resources/users"

export const adminScope: ScopeInterface = {
  name: "admin",
  label: "Administration",
  resources: [articles, users],
  decoratorComponent: AdminLayout,
  authorization: createScopeAuthorization({ roles: ["ROLE_ADMIN", "ROLE_EDITOR"] }),

  menu: [
    articles,
    {
      // An entry of its own, to add a getter: it names the scope its link leads to.
      ...createItemMenuWithResource({ resource: users, scope: "admin" }),
      // \`hidden\` is read each time the menu renders: a getter follows the session.
      get hidden() {
        return !hasRole("ROLE_ADMIN")
      },
    },
  ],
}`

const SIGN_OUT = `import { logout } from "react-jwt-session"
import { useScopeContext } from "react-resource-view"

export function SignOutButton() {
  const scopeContext = useScopeContext()

  return (
    <button
      onClick={async () => {
        // Clears the tokens and the profile, then revokes the refresh token.
        await logout()
        // Runs the scope's authorization again: no session → 401 → /login.
        scopeContext?.recheckAuthorization()
      }}
    >
      Sign out
    </button>
  )
}`

function AuthenticationJwt() {
  return (
    <DocArticle
      toc={[
        { id: "overview", title: "The recipe at a glance" },
        { id: "symfony", title: "Symfony: what the API provides" },
        { id: "config", title: "Configuring react-jwt-session" },
        { id: "alive", title: "Keeping the session alive" },
        { id: "scope", title: "Protecting a scope" },
        { id: "redirect", title: "Redirecting to sign in" },
        { id: "roles", title: "Roles, permissions and menu" },
        { id: "sign-out", title: "Signing out" },
        { id: "server", title: "The API decides" },
      ]}
    >
      <H2 id="overview">The recipe at a glance</H2>

      <P>
        Most API Platform applications sign their users in with{" "}
        <A href="https://github.com/lexik/LexikJWTAuthenticationBundle">
          LexikJWTAuthenticationBundle
        </A>
        : the API hands out a JWT, the browser sends it back on every request. This
        page wires that session to the <Term id="scope">scopes</Term> of
        react-resource-view with{" "}
        <A href="https://github.com/hermez-agency/react-jwt-session">
          react-jwt-session
        </A>{" "}
        0.2 — the same steps as the{" "}
        <A href="/docs/resource-view/authentication">Better Auth recipe</A>, and the
        same scope contract underneath: an <C>authorization</C> that ends in{" "}
        <C>true</C>, a 401 or a 403.
      </P>

      <Ol>
        <Li>
          Symfony signs in on <C>/api/auth</C>, renews on <C>/api/auth/refresh</C>{" "}
          and revokes on <C>/api/auth/logout</C>.
        </Li>
        <Li>
          react-jwt-session stores the token and the refresh token, and renews the
          first before it expires.
        </Li>
        <Li>
          Each scope awaits the session through <C>createScopeAuthorization</C>: no
          session sends the reader to sign in, a missing role shows a refusal.
        </Li>
        <Li>
          Flags and menu entries read the roles synchronously, from the JWT the scope
          has just checked.
        </Li>
      </Ol>

      <P>Each block below is meant to be copied as it is.</P>

      <H2 id="symfony">Symfony: what the API provides</H2>

      <P>
        Installing the bundle and generating its keys is{" "}
        <A href="https://symfony.com/bundles/LexikJWTAuthenticationBundle/current/index.html">
          Lexik's own documentation
        </A>
        . Only three things matter to the front end.
      </P>

      <H3>A sign-in route answering a token</H3>

      <P>
        A short-lived JWT — an hour — since nothing revokes it before it expires; the
        refresh token is what keeps the reader signed in.
      </P>

      <CodeBlock filename="config/packages/lexik_jwt_authentication.yaml" lang="yaml">
        {LEXIK}
      </CodeBlock>

      <CodeBlock filename="config/routes.yaml" lang="yaml">
        {ROUTES}
      </CodeBlock>

      <CodeBlock filename="config/packages/security.yaml" lang="yaml">
        {SECURITY}
      </CodeBlock>

      <P>
        Lexik puts the user's <C>getRoles()</C> in the token payload, under{" "}
        <C>roles</C>: that array is what every role check on this page reads.
      </P>

      <Callout kind="warning" title="role_hierarchy stays on the server">
        <P>
          The token carries the roles stored on the user, not the ones{" "}
          <C>role_hierarchy</C> derives from them. With{" "}
          <C>ROLE_ADMIN: ROLE_EDITOR</C>, an administrator's JWT holds{" "}
          <C>ROLE_ADMIN</C> only — so list every role that should get in, as the
          examples below do.
        </P>
      </Callout>

      <H3>A refresh token next to it</H3>

      <P>
        Lexik has no refresh token of its own: add one with{" "}
        <A href="https://github.com/markitosgv/JWTRefreshTokenBundle">
          gesdinet/jwt-refresh-token-bundle
        </A>{" "}
        — its <C>token_parameter_name</C> set to <C>refreshToken</C> — or with two
        endpoints of yours. Either way, react-jwt-session expects this contract:
      </P>

      <Ul>
        <Li>
          <C>POST /api/auth</C> answers <C>{"{ token, refreshToken }"}</C> — the
          JWT and, next to it, the refresh token.
        </Li>
        <Li>
          <C>POST /api/auth/refresh</C> takes <C>{"{ refreshToken }"}</C> and answers
          a new <C>{"{ token, refreshToken }"}</C>; both are stored again. A 4xx means
          the refresh token is dead — expired or revoked — and ends the session; a
          5xx or a network failure keeps it, and the renewal is tried again later.
        </Li>
        <Li>
          <C>POST /api/auth/logout</C> takes <C>{"{ refreshToken }"}</C> and revokes
          it.
        </Li>
      </Ul>

      <H3>A distinct answer to throttling</H3>

      <P>
        <C>login_throttling</C> refuses a sign-in with an authentication exception,
        which Lexik's failure handler turns into a 401 — the answer to a wrong
        password. To tell the reader to wait rather than to check their input, listen
        to Lexik's <C>AUTHENTICATION_FAILURE</C> event and, when the exception is a{" "}
        <C>TooManyLoginAttemptsAuthenticationException</C>, replace the response with
        a 429 carrying a <C>message</C>. The <C>authenticator</C> below turns that
        429 into a <C>TooManyLoginAttemptsError</C>.
      </P>

      <H2 id="config">Configuring react-jwt-session</H2>

      <CodeBlock lang="bash">{INSTALL}</CodeBlock>

      <P>
        <C>setUserConfig</C> is where the package learns your API: how to sign in,
        where the user comes from, and the two URLs of the refresh token. The same
        file hands the JWT to the client the <Term id="view">views</Term> request
        through.
      </P>

      <CodeBlock filename="session.ts" lang="ts">
        {SESSION}
      </CodeBlock>

      <PropsTable
        rows={[
          {
            name: "authenticator",
            type: "(credentials) => Promise<LoginReponseInterface>",
            description: (
              <>
                Exchanges the credentials for tokens. Store them with{" "}
                <C>setUserToken</C> — the refresh token goes under its own key.
              </>
            ),
          },
          {
            name: "getUser",
            type: "() => Promise<UserInterface | undefined>",
            description: (
              <>
                The signed-in user — an API Platform operation returning the current
                user. Roles do not come from here but from the JWT.
              </>
            ),
          },
          {
            name: "onLoginSuccess",
            type: "({ user }) => Promise<void>",
            description: "Runs after a successful sign-in.",
          },
          {
            name: "refreshUrl",
            type: "string",
            description: (
              <>
                Posted <C>{"{ refreshToken }"}</C> to renew the JWT. Without it, the
                session lasts as long as the JWT.
              </>
            ),
          },
          {
            name: "logoutUrl",
            type: "string",
            description: (
              <>
                Posted <C>{"{ refreshToken }"}</C> by <C>logout()</C>, to revoke it.
              </>
            ),
          },
        ]}
      />

      <Callout kind="note" title="Your own HTTP client">
        <P>
          <C>refreshTokenRequest</C> and <C>revokeRefreshToken</C> replace the two
          URLs with functions of yours, and take precedence over them — see{" "}
          <A href="https://github.com/hermez-agency/react-jwt-session#refresh-token">
            the README
          </A>
          .
        </P>
      </Callout>

      <H2 id="alive">Keeping the session alive</H2>

      <P>
        Call <C>keepSessionAlive()</C> once, when the application starts. It renews
        the JWT two minutes before it expires, schedules the next renewal, and checks
        again when the tab becomes visible or the network comes back — a laptop put
        to sleep lets the hour pass without its timer noticing. Without a refresh
        token it does nothing, so it is safe to call before anyone has signed in.
      </P>

      <CodeBlock filename="main.tsx">{MAIN}</CodeBlock>

      <P>
        After a sign-in, a new refresh token exists: the <C>onLoginSuccess</C> of{" "}
        <C>session.ts</C> calls <C>keepSessionAlive()</C> again to start renewing
        it. <C>UserProvider</C> is what the login form below reads{" "}
        <C>useUserContext()</C> from.
      </P>

      <H2 id="scope">Protecting a scope</H2>

      <P>
        <C>react-jwt-session/resource-view</C> turns the session into the async{" "}
        <A href="/docs/resource-view/scopes">scope</A> authorization react-resource-view
        expects — one line per scope:
      </P>

      <CodeBlock filename="scopes/admin.ts" lang="ts">
        {SCOPE}
      </CodeBlock>

      <Ul>
        <Li>
          <strong>Nobody signed in</strong>, or a session that could not be renewed —
          throws <C>UnauthorizedError</C>, a 401.
        </Li>
        <Li>
          <strong>
            A session holding none of the <C>roles</C>
          </strong>{" "}
          — throws <C>ForbiddenError</C>, a 403: signed in, but not allowed here.
        </Li>
        <Li>
          <strong>Otherwise</strong> — <C>true</C>, and the scope renders. Leave{" "}
          <C>roles</C> out to let any signed-in user in.
        </Li>
      </Ul>

      <P>
        Before answering, it awaits <C>loadSession()</C>, which renews the JWT first
        when it has expired or is about to. A reader coming back the next day, with an
        expired JWT but a live refresh token, lands on the page they asked for — not
        on the login form.
      </P>

      <Callout kind="note" title="An optional peer dependency">
        <P>
          The sub-path imports <C>UnauthorizedError</C> and <C>ForbiddenError</C>{" "}
          from react-resource-view, an optional peer dependency of react-jwt-session:
          only this entry needs it.
        </P>
      </Callout>

      <H2 id="redirect">Redirecting to sign in</H2>

      <P>
        <C>onUnauthorized</C> on the configuration receives every 401 of every scope.
        Pass the page the reader was on, so the login form can bring them back to it.
      </P>

      <CodeBlock filename="Admin.tsx">{PROVIDER}</CodeBlock>

      <PropsTable
        rows={[
          {
            name: "onUnauthorized",
            type: "() => void",
            description: "Called on a 401, thrown or rejected.",
          },
          {
            name: "authorizationFallback",
            type: "ReactNode",
            description: (
              <>
                Shown while <C>authorization</C> is pending — here, while the session
                is read and perhaps renewed. Defaults to the page loader. Also
                accepted on the scope, which wins.
              </>
            ),
          },
          {
            name: "forbiddenFallback",
            type: "ReactNode",
            description: (
              <>
                Shown on a 403 or a <C>false</C>. Defaults to an “Access denied”
                message. Also accepted on the scope, which wins.
              </>
            ),
          },
        ]}
      />

      <P>
        The login form signs in through <C>useUserContext()</C>, then goes back to{" "}
        <C>redirect</C>. A locked account gets the API's message; anything else, the
        usual one.
      </P>

      <CodeBlock filename="routes/login.tsx">{LOGIN}</CodeBlock>

      <H2 id="roles">Roles, permissions and menu</H2>

      <P>
        The scope decides who gets in; the{" "}
        <A href="/docs/resource-view/permissions">permissions</A> decide what
        each reader is offered inside. They are asked per action and per row, so
        they should not wait for a request — and they do not need to:{" "}
        <C>hasRole(role)</C> reads the roles of the stored JWT synchronously, and
        returns <C>false</C> once it has expired.
      </P>

      <P>
        The scope's authorization has awaited <C>loadSession()</C> before any view of
        the scope renders — so by then the JWT has been renewed if it had to be, and
        reading it synchronously is safe. <C>loadSession()</C> itself is there for
        your own async code:
      </P>

      <CodeBlock lang="ts">{LOAD_SESSION}</CodeBlock>

      <P>
        The <Term id="resource">resources</Term> read the roles:
      </P>

      <CodeBlock filename="resources/articles.ts" lang="ts">
        {FLAGS}
      </CodeBlock>

      <P>And so does the menu — the same scope file, with a getter on the entry:</P>

      <CodeBlock filename="scopes/admin.ts" lang="ts">
        {MENU}
      </CodeBlock>

      <Callout kind="tip" title="Inside React, useUserContext works too">
        <P>
          A component of yours — a top bar, an avatar — can read{" "}
          <C>useUserContext()</C> for the <C>user</C> and its <C>hasRole</C>. The
          plain <C>hasRole</C> exists for the places that are not components:
          permissions and menu entries, declared once, outside any render.
        </P>
      </Callout>

      <H2 id="sign-out">Signing out</H2>

      <P>
        Signing out changes nothing the scope can see by itself. End the session,
        then ask the scope to check again: the authorization now finds no session,
        throws a 401, and <C>onUnauthorized</C> takes the reader to <C>/login</C> —
        no reload.
      </P>

      <CodeBlock filename="SignOutButton.tsx">{SIGN_OUT}</CodeBlock>

      <Ol>
        <Li>
          <C>logout()</C> empties the storage at once — JWT, refresh token, profile —
          and forgets the session <C>loadSession()</C> kept. It then posts the
          refresh token to <C>logoutUrl</C>; awaiting it lets the revocation leave
          before anything else happens. It never rejects.
        </Li>
        <Li>
          <C>recheckAuthorization()</C> hides the scope behind its fallback and runs{" "}
          <C>authorization</C> again.
        </Li>
      </Ol>

      <P>
        The button has to render inside the scope to reach its context —{" "}
        <A href="/docs/resource-view/admin-layout">AdminLayout</A>&apos;s{" "}
        <C>sidebarFooter</C> is a natural place for it.
      </P>

      <H2 id="server">The API decides</H2>

      <Callout kind="warning" title="This only protects the interface">
        <P>
          Everything on this page runs in the browser, where anyone can change it,
          and react-jwt-session never verifies the token's signature. It decides
          what is <em>shown</em>. API Platform must check the JWT and the role again
          on every request — <C>access_control</C>, a <C>security</C> expression on
          the operation — or the protected data is one <C>fetch</C> away.
        </P>
      </Callout>
    </DocArticle>
  )
}
