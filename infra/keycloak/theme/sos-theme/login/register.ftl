<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${msg("registerTitle")}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link href="${url.resourcesPath}/css/styles.css" rel="stylesheet" />
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <div class="logo-circle">
                    <i data-lucide="user-plus" class="logo-icon"></i>
                </div>
                <h1>Criar Conta</h1>
                <p>Cadastre-se para colaborar no SOS Location</p>
            </div>

            <form id="kc-register-form" class="login-form" action="${url.registrationAction}" method="post">
                <div class="form-group">
                    <label for="firstName" class="form-label">${msg("firstName")}</label>
                    <input type="text" id="firstName" class="form-input" name="firstName" value="${(register.formData.firstName!'')}" />
                </div>

                <div class="form-group">
                    <label for="lastName" class="form-label">${msg("lastName")}</label>
                    <input type="text" id="lastName" class="form-input" name="lastName" value="${(register.formData.lastName!'')}" />
                </div>

                <div class="form-group">
                    <label for="email" class="form-label">${msg("email")}</label>
                    <input type="text" id="email" class="form-input" name="email" value="${(register.formData.email!'')}" autocomplete="email" />
                </div>

                <#if !realm.registrationEmailAsUsername>
                    <div class="form-group">
                        <label for="username" class="form-label">${msg("username")}</label>
                        <input type="text" id="username" class="form-input" name="username" value="${(register.formData.username!'')}" autocomplete="username" />
                    </div>
                </#if>

                <#if passwordRequired??>
                    <div class="form-group">
                        <label for="password" class="form-label">${msg("password")}</label>
                        <input type="password" id="password" class="form-input" name="password" autocomplete="new-password" />
                    </div>
                    <div class="form-group">
                        <label for="password-confirm" class="form-label">${msg("passwordConfirm")}</label>
                        <input type="password" id="password-confirm" class="form-input" name="password-confirm" />
                    </div>
                </#if>

                <div class="form-submit">
                    <button class="btn-primary" type="submit">${msg("doRegister")}</button>
                </div>
            </form>

            <div class="login-footer">
                <span>Já tem uma conta?</span>
                <a href="${url.loginUrl}">${msg("backToLogin")?no_esc}</a>
            </div>
        </div>
    </div>
    <script>lucide.createIcons();</script>
</body>
</html>
