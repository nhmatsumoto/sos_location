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
                    <i data-lucide="key" class="logo-icon"></i>
                </div>
                <h1>${msg("emailForgotTitle")}</h1>
                <p>Recupere o acesso à sua conta</p>
            </div>

            <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                <div class="alert alert-${message.type}">
                    <span class="alert-text">${kcSanitize(message.summary)?no_esc}</span>
                </div>
            </#if>

            <form id="kc-reset-password-form" class="login-form" action="${url.loginAction}" method="post">
                <div class="form-group">
                    <label for="username" class="form-label">${msg("emailInstruction")}</label>
                    <input tabindex="1" id="username" class="form-input" name="username" type="text" autofocus autocomplete="email" placeholder="Seu e-mail" />
                </div>

                <div class="form-submit">
                    <button tabindex="2" class="btn-primary" type="submit">
                        ${msg("doSubmit")}
                    </button>
                </div>
                
                <div class="login-footer">
                    <a tabindex="3" href="${url.loginUrl}">${msg("backToLogin")}</a>
                </div>
            </form>
        </div>
    </div>
    <script>lucide.createIcons();</script>
</body>
</html>
