<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${msg("accountManagementTitle")}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link href="${url.resourcesPath}/css/styles.css" rel="stylesheet" />
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <div class="logo-circle">
                    <i data-lucide="user" class="logo-icon"></i>
                </div>
                <h1>${msg("accountManagementTitle")}</h1>
                <p>Gerenciamento de Identidade Tactical</p>
            </div>

            <#if message?has_content>
                <div class="alert alert-${message.type}">
                    <span class="alert-text">${kcSanitize(message.summary)?no_esc}</span>
                </div>
            </#if>

            <ul class="nav-list" style="list-style: none; margin-bottom: 2rem;">
                <li style="margin-bottom: 1rem;">
                    <a href="${url.accountUrl}" class="brand-btn" style="justify-content: flex-start; gap: 12px; background: rgba(59, 130, 246, 0.1); border-color: var(--primary-color);">
                        <i data-lucide="user-round" size="18"></i>
                        <span>${msg("account")}</span>
                    </a>
                </li>
                <li style="margin-bottom: 1rem;">
                    <a href="${url.passwordUrl}" class="brand-btn" style="justify-content: flex-start; gap: 12px;">
                        <i data-lucide="key-round" size="18"></i>
                        <span>${msg("password")}</span>
                    </a>
                </li>
                <#if features.logEnabled>
                <li style="margin-bottom: 1rem;">
                    <a href="${url.logUrl}" class="brand-btn" style="justify-content: flex-start; gap: 12px;">
                        <i data-lucide="history" size="18"></i>
                        <span>${msg("log")}</span>
                    </a>
                </li>
                </#if>
            </ul>

            <div class="login-footer">
                <a href="${url.referrerURI!'#'}" class="btn-primary" style="display: block; text-align: center; text-decoration: none;">
                    ${msg("backToApplication")}
                </a>
            </div>
        </div>
    </div>
    <script>lucide.createIcons();</script>
</body>
</html>
