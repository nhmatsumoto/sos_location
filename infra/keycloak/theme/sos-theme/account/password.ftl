<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${msg("editAccountHtmlTitle")}</title>
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
                <h1>${msg("editAccountHtmlTitle")}</h1>
                <p>Atualize as informações da sua conta operacional</p>
            </div>

            <#if message?has_content>
                <div class="alert alert-${message.type}">
                    <span class="alert-text">${kcSanitize(message.summary)?no_esc}</span>
                </div>
            </#if>

            <form action="${url.accountUrl}" class="login-form" method="post">
                <input type="hidden" id="stateChecker" name="stateChecker" value="${stateChecker}">

                <#if !realm.registrationEmailAsUsername>
                    <div class="form-group">
                        <label for="username" class="form-label">${msg("username")} <#if messagesPerField.existsError('username')><span class="error">${messagesPerField.get('username')}</span></#if></label>
                        <input type="text" id="username" name="username" <#if !account.usernameEditAllowed>disabled="disabled"</#if> value="${(account.username!'')}" class="form-input" />
                    </div>
                </#if>

                <div class="form-group">
                    <label for="email" class="form-label">${msg("email")} <#if messagesPerField.existsError('email')><span class="error">${messagesPerField.get('email')}</span></#if></label>
                    <input type="text" id="email" name="email" value="${(account.email!'')}" class="form-input" />
                </div>

                <div class="form-group">
                    <label for="firstName" class="form-label">${msg("firstName")} <#if messagesPerField.existsError('firstName')><span class="error">${messagesPerField.get('firstName')}</span></#if></label>
                    <input type="text" id="firstName" name="firstName" value="${(account.firstName!'')}" class="form-input" />
                </div>

                <div class="form-group">
                    <label for="lastName" class="form-label">${msg("lastName")} <#if messagesPerField.existsError('lastName')><span class="error">${messagesPerField.get('lastName')}</span></#if></label>
                    <input type="text" id="lastName" name="lastName" value="${(account.lastName!'')}" class="form-input" />
                </div>

                <div class="form-submit" style="display: flex; gap: 12px; margin-top: 2rem;">
                    <button type="submit" class="btn-primary" name="submitAction" value="Save" style="flex: 1;">
                        ${msg("doSave")}
                    </button>
                    <button type="submit" class="brand-btn" name="submitAction" value="Cancel" style="flex: 1;">
                        ${msg("doCancel")}
                    </button>
                </div>
            </form>
        </div>
    </div>
    <script>lucide.createIcons();</script>
</body>
</html>
