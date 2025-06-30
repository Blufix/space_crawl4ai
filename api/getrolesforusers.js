module.exports = async function (context, req) {
    context.log('=== Role API Called ===');
    context.log('Request method:', req.method);
    context.log('Request body:', JSON.stringify(req.body, null, 2));
    context.log('Request headers:', JSON.stringify(req.headers, null, 2));
    
    // Get user claims from the request
    const userClaims = req.body || {};
    
    // Extract user information
    const userId = userClaims.sub || userClaims.objectId || userClaims.oid;
    const userPrincipalName = userClaims.upn || userClaims.preferred_username || userClaims.email;
    const roles = userClaims.roles || [];
    
    context.log('User ID:', userId);
    context.log('User Principal Name:', userPrincipalName);
    context.log('Raw roles from claims:', roles);
    
    // Always return at least one role to test
    let userRoles = [];
    
    if (roles && roles.length > 0) {
        userRoles = roles;
    } else {
        // Default roles for testing
        userRoles = ['user'];
        context.log('No roles in claims, defaulting to user role');
    }
    
    context.log('Final roles being returned:', userRoles);
    
    context.res = {
        status: 200,
        body: userRoles,
        headers: {
            'Content-Type': 'application/json'
        }
    };
};