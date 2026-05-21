import { createContext, useEffect, useState, useContext } from "react";
import { hasSupabaseConfig, supabase } from "../supabaseClient";

const AuthContext = createContext()

export const AuthContextProvider = ({children}) => {
    const [session, setSession] = useState(undefined)

    //sign up new user
    const signUpNewUser = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        })

        if(error) {
            console.rrror("there was an error signing up the user: ", error);
            return {success: false, error};
        }
        return {success: true, data };

    }

    //sign in existing user
    const signInUser = async (email, password) => {
        try{
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            }); 
            if (error) {
                console.error("Error signing in user: ", error);
                return { success: false, error: error.message };
            }
            console.log("User signed in successfully: ", data);
            return { success: true, data };
        }catch (error) {
            console.error("Error signing in user: ", error);
        }
    };

    useEffect(() => {
        if (!hasSupabaseConfig) {
            setSession(null);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
    },[])

    //signout
    const signOut = () => {
        const { error } = supabase.auth.signOut();
        if (error) {
            console.error("Error signing out: ", error);
        }
    }

    return  (
        <AuthContext.Provider value={{session, signUpNewUser, signInUser, signOut}}>
            {children}
        </AuthContext.Provider>
    )
}

export const UserAuth = () => {
    const c = useContext(AuthContext);
    if (!c) throw new Error("AuthContext must be used within <AuthContextProvider>");
    return c; 
} 
