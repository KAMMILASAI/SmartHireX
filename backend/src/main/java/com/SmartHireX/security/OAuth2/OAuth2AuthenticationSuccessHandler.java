package com.SmartHireX.security.oauth2;

import java.io.IOException;
import java.net.URI;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import com.SmartHireX.config.OAuth2Properties;
import com.SmartHireX.entity.Role;
import com.SmartHireX.entity.User;
import com.SmartHireX.exception.BadRequestException;
import com.SmartHireX.repository.UserRepository;
import com.SmartHireX.security.JwtTokenProvider;
import com.SmartHireX.security.UserPrincipal;
import static com.SmartHireX.security.oauth2.HttpCookieOAuth2AuthorizationRequestRepository.REDIRECT_URI_PARAM_COOKIE_NAME;
import com.SmartHireX.util.CookieUtils;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private JwtTokenProvider tokenProvider;
    private OAuth2Properties oAuth2Properties;
    private HttpCookieOAuth2AuthorizationRequestRepository httpCookieOAuth2AuthorizationRequestRepository;
    private UserRepository userRepository;

    @Autowired
    OAuth2AuthenticationSuccessHandler(JwtTokenProvider tokenProvider, OAuth2Properties oAuth2Properties,
                                       @Lazy HttpCookieOAuth2AuthorizationRequestRepository httpCookieOAuth2AuthorizationRequestRepository,
                                       UserRepository userRepository) {
        this.tokenProvider = tokenProvider;
        this.oAuth2Properties = oAuth2Properties;
        this.httpCookieOAuth2AuthorizationRequestRepository = httpCookieOAuth2AuthorizationRequestRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        String targetUrl = determineTargetUrl(request, response, authentication);

        if (response.isCommitted()) {
            logger.debug("Response has already been committed. Unable to redirect to " + targetUrl);
            return;
        }

        clearAuthenticationAttributes(request, response);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    @Override
    protected String determineTargetUrl(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        Optional<String> redirectUri = CookieUtils.getCookie(request, REDIRECT_URI_PARAM_COOKIE_NAME)
                .map(Cookie::getValue);

        if(redirectUri.isPresent() && !isAuthorizedRedirectUri(redirectUri.get())) {
            throw new BadRequestException("Sorry! We've got an Unauthorized Redirect URI and can't proceed with the authentication");
        }

        String defaultTargetUrl = oAuth2Properties.getAuthorizedRedirectUris().stream()
            .findFirst()
            .orElse("https://smarthirex.netlify.app/oauth2/redirect");
        String targetUrl = redirectUri.orElse(defaultTargetUrl);
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        
        // Get user details from database - user should exist after CustomOAuth2UserService processing
        User user = userRepository.findByEmail(userPrincipal.getEmail()).orElse(null);
        
        if (user == null) {
            // This should not happen if CustomOAuth2UserService worked correctly
            logger.error("User not found after OAuth2 authentication for email: " + userPrincipal.getEmail());
            return UriComponentsBuilder.fromUriString(targetUrl)
                    .queryParam("error", "user_not_found")
                    .queryParam("message", "User not found after authentication")
                    .queryParam("email", userPrincipal.getEmail())
                    .build().toUriString();
        }
        
        // All OAuth2 users register as CANDIDATE by default
        // Admins can later promote users to RECRUITER role via admin panel
        if (user.getRole() == null) {
            user.setRole(Role.CANDIDATE);
            user.setVerified(true); // OAuth2 users are auto-verified
            userRepository.save(user);
            logger.info("Set default role CANDIDATE for OAuth2 user: " + user.getEmail());
        }
        
        
        logger.info("OAuth2 authentication successful for user: " + user.getEmail() + " with role: " + user.getRole());
        
        // Check if recruiter is pending approval
        if (user.getRole() == Role.RECRUITER && !user.isVerified()) {
            return UriComponentsBuilder.fromUriString(targetUrl)
                    .queryParam("error", "pending_approval")
                    .queryParam("role", "recruiter")
                    .build().toUriString();
        }

        String token = tokenProvider.generateToken(authentication);
        return UriComponentsBuilder.fromUriString(targetUrl)
                .queryParam("token", token)
                .queryParam("userId", userPrincipal.getId())
                .queryParam("email", userPrincipal.getEmail())
                .queryParam("firstName", userPrincipal.getFirstName())
                .queryParam("lastName", userPrincipal.getLastName())
                .queryParam("role", user.getRole().name().toLowerCase())
                .queryParam("emailVerified", user.isEmailVerified())
                .queryParam("oAuth2Provider", user.getProvider() != null ? user.getProvider().name() : "local")
                .build().toUriString();
    }

    protected void clearAuthenticationAttributes(HttpServletRequest request, HttpServletResponse response) {
        super.clearAuthenticationAttributes(request);
        httpCookieOAuth2AuthorizationRequestRepository.removeAuthorizationRequestCookies(request, response);
    }

    private boolean isAuthorizedRedirectUri(String uri) {
        URI clientRedirectUri = URI.create(uri);

        return oAuth2Properties.getAuthorizedRedirectUris()
                .stream()
                .anyMatch(authorizedRedirectUri -> {
                    // Only validate host and port. Let the clients use different paths if they want to
                    URI authorizedURI = URI.create(authorizedRedirectUri);
                    if(authorizedURI.getHost().equalsIgnoreCase(clientRedirectUri.getHost())
                            && authorizedURI.getPort() == clientRedirectUri.getPort()) {
                        return true;
                    }
                    return false;
                });
    }
}
