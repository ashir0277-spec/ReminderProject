import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../../Components/firebase";
import { toast, ToastContainer } from "react-toastify";
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("All fields are required", { position: "top-center" });
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2️⃣ Firestore se user data fetch
      const querySnapshot = await getDocs(collection(db, "users"));
      let userData = null;

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.uid === user.uid) {
          userData = {
            id: docSnap.id,
            fullName: data.fullName || 'User',
            email: data.email,
            role: data.role,
            status: data.status
          };
        }
      });

      // 3️⃣ First-time login: user create (sirf Admin example, baki roles Firestore me honi chahiye)
      if (!userData) {
        const newUserRef = await addDoc(collection(db, "users"), {
          uid: user.uid,
          fullName: email.split('@')[0],
          email: user.email,
          role: "Admin", // Pehle se Firestore me roles honi chahiye, varna sab Admin banenge
          status: "active",
          createdAt: serverTimestamp()
        });

        userData = {
          id: newUserRef.id,
          fullName: email.split('@')[0],
          email: user.email,
          role: "Admin",
          status: "active"
        };
      }

      // 4️⃣ Status check
      if (userData.status === 'inactive') {
        toast.error("Your account is inactive. Contact administrator.", { position: "top-center" });
        await auth.signOut();
        sessionStorage.clear();
        setLoading(false);
        return;
      }

      // 5️⃣ SessionStorage set
      sessionStorage.setItem('userRole', userData.role);
      sessionStorage.setItem('userId', user.uid);
      sessionStorage.setItem('userEmail', user.email);
      sessionStorage.setItem('userName', userData.fullName);

      // 6️⃣ Role-based redirect
      let redirectPath = "/login"; // fallback
      switch(userData.role) {
        case "Admin":
          redirectPath = "/admin/dashboard";
          break;
        case "HR":
          redirectPath = "/hr/dashboard";
          break;
        case "CEO":
          redirectPath = "/ceo/dashboard";
          break;
        case "CTO":
          redirectPath = "/cto/dashboard";
          break;
        default:
          redirectPath = "/login";
      }

      toast.success(`Welcome back, ${userData.fullName}!`, { position: "top-center" });

      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 500);

    } catch (error) {
      console.error("Login error:", error);

      let errorMessage = "Login failed. Please try again.";
      if (error.code === 'auth/user-not-found') errorMessage = "No account found with this email.";
      else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') errorMessage = "Incorrect password.";
      else if (error.code === 'auth/invalid-email') errorMessage = "Invalid email address.";
      else if (error.code === 'auth/user-disabled') errorMessage = "This account has been disabled.";
      else if (error.code === 'auth/too-many-requests') errorMessage = "Too many failed attempts. Try later.";

      toast.error(errorMessage, { position: "top-center" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <ToastContainer />
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Login</h1>
            <p className="text-gray-500 text-sm">Sign in to continue to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transform hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <button 
                type="button" 
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot Password?
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          © 2026 Your Company. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
