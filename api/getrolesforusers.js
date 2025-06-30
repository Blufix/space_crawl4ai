module.exports = async function (context, req) {
    // Get user claims from the request
    const userClaims = req.body;
    
    // Extract user information
    const userId = userClaims.sub || userClaims.objectId;
    const userPrincipalName = userClaims.upn || userClaims.preferred_username;
    const roles = userClaims.roles || [];
    
    context.log('Processing role assignment for user:', userPrincipalName);
    context.log('User claims roles:', roles);
    
    // Return the roles from Azure AD claims
    // The roles should already be in the token from your App Registration
    const userRoles = roles.length > 0 ? roles : ['user']; // Default to 'user' if no roles
    
    context.log('Returning roles:', userRoles);
    
    context.res = {
        status: 200,
        body: userRoles,
        headers: {
            'Content-Type': 'application/json'
        }
    };
};