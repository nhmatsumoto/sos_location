<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${msg("loginProfileTitle")}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link href="${url.resourcesPath}/css/styles.css" rel="stylesheet" />
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <div class="logo-circle">
                    <i data-lucide="user-cog" class="logo-icon"></i>
                </div>
                <h1>${msg("loginProfileTitle")}</h1>
                <p>Atualize suas credenciais para continuar no Guardian OS</p>
            </div>

            <#if message?has_content>
                <div class="alert alert-${message.type}">
                    <span class="alert-text">${kcSanitize(message.summary)?no_esc}</span>
                </div>
            </#if>

            <form id="kc-update-profile-form" class="login-form" action="${url.loginAction}" method="post">
                <#if user.editUsernameAllowed>
                    <div class="form-group">
                        <label for="username" class="form-label">${msg("username")}</label>
                        <input type="text" id="username" name="username" value="${(user.username!'')}" class="form-input" autofocus autocomplete="username" />
                    </div>
                </#if>

                <div class="form-group">
                    <label for="email" class="form-label">${msg("email")}</label>
                    <input type="text" id="email" name="email" value="${(user.email!'')}" class="form-input" autocomplete="email" />
                </div>

                <div class="form-group">
                    <label for="firstName" class="form-label">${msg("firstName")}</label>
                    <input type="text" id="firstName" name="firstName" value="${(user.firstName!'')}" class="form-input" autocomplete="given-name" />
                </div>

                <div class="form-group">
                    <label for="lastName" class="form-label">${msg("lastName")}</label>
                    <input type="text" id="lastName" name="lastName" value="${(user.lastName!'')}" class="form-input" autocomplete="family-name" />
                </div>

                <div class="form-submit">
                    <button class="btn-primary" type="submit">
                        ${msg("doSubmit")}
                    </button>
                </div>
            </form>
        </div>
    </div>
    <script>lucide.createIcons();</script>
</body>
</html>
