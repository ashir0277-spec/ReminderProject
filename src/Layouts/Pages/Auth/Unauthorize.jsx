import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';

const Unauthorized = () => {
    const navigate = useNavigate();

    return (
        <div className=" bg-amber-500 min-h-screen  flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-md w-full mx-4">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="bg-red-100 rounded-full p-5">
                            <ShieldAlert className="text-red-600" size={48} />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-gray-800 mb-3">
                        Access Denied
                    </h1>

                    {/* Description */}
                    <p className="text-gray-600 mb-8">
                        You don't have permission to access this page.
                    </p>

                    {/* Button */}
                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <Home size={20} />
                        Go to Login
                    </button>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    © 2026 Your Company. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default Unauthorized;