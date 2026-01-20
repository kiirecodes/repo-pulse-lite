export async function onRequest(context) {
  const { env } = context;
  
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authUrl.searchParams.set('scope', 'repo read:user');
  authUrl.searchParams.set('redirect_uri', env.GITHUB_REDIRECT_URI);
  
  return Response.redirect(authUrl.toString(), 302);
}
