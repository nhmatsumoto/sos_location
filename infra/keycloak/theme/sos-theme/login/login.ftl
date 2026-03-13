<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link href="${url.resourcesPath}/css/styles.css" rel="stylesheet" />
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <div class="logo-circle">
                    <i data-lucide="shield" class="logo-icon"></i>
                </div>
                <h1>SOS Location</h1>
                <p>Acesse o Portal Tático</p>
            </div>

            <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                <div class="alert alert-${message.type}">
                    <span class="alert-text">${kcSanitize(message.summary)?no_esc}</span>
                </div>
            </#if>

            <form id="kc-form-login" class="login-form" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                
                <div class="form-group">
                    <label for="username" class="form-label">${msg("usernameOrEmail")}</label>
                    <input tabindex="1" id="username" class="form-input" name="username" value="${(login.username!'')}" type="text" autofocus autocomplete="username" placeholder="Seu usuário ou e-mail" />
                </div>

                <div class="form-group">
                    <label for="password" class="form-label">${msg("password")}</label>
                    <input tabindex="2" id="password" class="form-input" name="password" type="password" autocomplete="current-password" placeholder="Sua senha" />
                </div>

                <div class="form-options">
                    <#if realm.rememberMe>
                        <div class="remember-me">
                            <label>
                                <#if login.rememberMe??>
                                    <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" checked>
                                <#else>
                                    <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox">
                                </#if>
                                <span>${msg("rememberMe")}</span>
                            </label>
                        </div>
                    </#if>
                    
                    <#if realm.resetPasswordAllowed>
                        <div class="forgot-password">
                            <a tabindex="5" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
                        </div>
                    </#if>
                </div>

                <div class="form-submit">
                    <button tabindex="4" class="btn-primary" name="login" id="kc-login" type="submit">
                        ${msg("doLogIn")}
                    </button>
                </div>
            </form>

            <#if realm.password && social.providers??>
                <div class="social-providers">
                    <div class="divider">
                        <span>Ou continue com</span>
                    </div>
                    <div class="provider-list">
                        <#list social.providers as p>
                            <a href="${p.loginUrl}" id="social-${p.alias}" class="brand-btn">
                                <span>${p.displayName!}</span>
                            </a>
                        </#list>
                    </div>
                </div>
            </#if>

            <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
                <div class="login-footer">
                    <span>${msg("noAccount")}</span>
                    <a tabindex="6" href="${url.registrationUrl}">${msg("doRegister")}</a>
                </div>
            </#if>
        </div>
    </div>
    <script>lucide.createIcons();</script>
</body>
</html>
