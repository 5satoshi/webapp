import type React from 'react';
import { cn } from '@/lib/utils';

// New SVG for the provided image
const NewFiveSDollarLogoSVG: React.FC<{ width: number; height: number; className?: string }> = ({ width, height, className }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 80 80" // Using an 80x80 viewBox for easier definition
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-labelledby="logoTitleActual"
    role="img"
  >
    <title id="logoTitleActual">5satoshi Logo</title>
    <defs>
      <linearGradient id="orangeToPurple64" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="orange" />
        <stop offset="100%" stopColor="indigo" />
      </linearGradient>
    </defs>

    <path d="M 76 71 L 75 72 L 75 159 L 76 160 L 76 165 L 77 166 L 77 169 L 78 170 L 78 173 L 79 174 L 79 175 L 80 176 L 80 178 L 81 179 L 81 180 L 82 181 L 82 182 L 84 184 L 84 185 L 85 186 L 85 187 L 86 188 L 86 189 L 90 193 L 90 194 L 96 200 L 97 200 L 101 204 L 102 204 L 104 206 L 105 206 L 107 208 L 108 208 L 109 209 L 110 209 L 111 210 L 112 210 L 113 211 L 114 211 L 115 212 L 117 212 L 118 213 L 120 213 L 121 214 L 125 214 L 126 215 L 131 215 L 132 216 L 181 216 L 182 215 L 182 212 L 180 210 L 179 210 L 173 204 L 172 204 L 167 199 L 166 199 L 158 191 L 157 191 L 151 185 L 150 185 L 146 181 L 145 181 L 137 173 L 136 173 L 134 171 L 134 151 L 135 150 L 135 145 L 136 144 L 136 142 L 137 141 L 137 139 L 138 138 L 138 136 L 140 134 L 140 133 L 142 131 L 142 130 L 143 129 L 143 128 L 149 122 L 150 122 L 153 119 L 154 119 L 155 118 L 156 118 L 157 117 L 158 117 L 159 116 L 160 116 L 161 115 L 164 115 L 165 114 L 181 114 L 182 113 L 182 102 L 183 101 L 184 101 L 185 100 L 190 100 L 191 101 L 192 100 L 199 100 L 200 101 L 206 101 L 207 100 L 213 100 L 214 101 L 215 101 L 216 102 L 216 111 L 217 112 L 217 113 L 219 113 L 220 114 L 221 113 L 222 114 L 225 114 L 226 113 L 227 114 L 234 114 L 235 115 L 237 115 L 238 116 L 239 116 L 240 117 L 242 117 L 243 118 L 244 118 L 246 120 L 247 120 L 249 122 L 250 122 L 251 123 L 251 124 L 252 124 L 253 125 L 253 126 L 254 126 L 256 128 L 256 129 L 257 130 L 257 131 L 259 133 L 259 134 L 260 135 L 260 136 L 261 137 L 261 139 L 262 140 L 262 142 L 263 143 L 263 146 L 264 147 L 264 148 L 322 148 L 323 147 L 323 71 Z" fill="url(#orangeToPurple64)" stroke="url(#orangeToPurple64)" strokeWidth="8" transform="translate(0.2,1.0) scale(0.2,0.2)" />
    
    <path d="M 217 174 L 217 179 L 218 179 L 219 180 L 219 181 L 220 181 L 225 186 L 226 186 L 232 192 L 233 192 L 238 197 L 239 197 L 245 203 L 246 203 L 247 204 L 247 205 L 248 206 L 249 206 L 253 210 L 254 210 L 259 215 L 260 215 L 264 219 L 264 243 L 263 244 L 263 247 L 262 248 L 262 250 L 261 251 L 261 253 L 260 254 L 260 255 L 259 256 L 259 257 L 258 258 L 258 259 L 254 263 L 254 264 L 250 268 L 249 268 L 247 270 L 246 270 L 244 272 L 243 272 L 241 274 L 239 274 L 238 275 L 236 275 L 235 276 L 231 276 L 230 277 L 217 277 L 217 278 L 216 279 L 216 289 L 215 290 L 183 290 L 182 289 L 182 277 L 168 277 L 167 276 L 164 276 L 163 275 L 161 275 L 160 274 L 158 274 L 157 273 L 156 273 L 155 272 L 154 272 L 152 270 L 151 270 L 147 266 L 146 266 L 144 264 L 144 263 L 141 260 L 141 259 L 140 258 L 140 257 L 138 255 L 138 253 L 137 252 L 137 251 L 136 250 L 136 248 L 135 247 L 135 244 L 133 242 L 132 243 L 131 242 L 130 242 L 129 243 L 128 242 L 79 242 L 78 243 L 75 243 L 75 262 L 76 263 L 76 268 L 77 269 L 77 273 L 78 274 L 78 276 L 79 277 L 79 279 L 80 280 L 80 281 L 81 282 L 81 283 L 82 284 L 82 285 L 84 287 L 84 288 L 85 289 L 85 290 L 87 292 L 87 293 L 89 295 L 89 296 L 97 304 L 98 304 L 101 307 L 102 307 L 104 309 L 105 309 L 107 311 L 108 311 L 109 312 L 110 312 L 111 313 L 112 313 L 113 314 L 115 314 L 116 315 L 117 315 L 118 316 L 120 316 L 121 317 L 124 317 L 125 318 L 128 318 L 129 319 L 269 319 L 270 318 L 273 318 L 274 317 L 277 317 L 278 316 L 280 316 L 281 315 L 283 315 L 284 314 L 285 314 L 286 313 L 287 313 L 288 312 L 289 312 L 290 311 L 291 311 L 292 310 L 293 310 L 296 307 L 297 307 L 299 305 L 300 305 L 309 296 L 309 295 L 312 292 L 312 291 L 314 289 L 314 288 L 315 287 L 315 286 L 316 285 L 316 284 L 317 283 L 317 282 L 318 281 L 318 280 L 319 279 L 319 277 L 320 276 L 320 274 L 321 273 L 321 270 L 322 269 L 322 264 L 323 263 L 323 229 L 322 228 L 322 224 L 321 223 L 321 220 L 320 219 L 320 217 L 319 216 L 319 214 L 318 213 L 318 212 L 317 211 L 317 210 L 316 209 L 
316 208 L 315 207 L 315 206 L 314 205 L 314 204 L 312 202 L 312 201 L 310 199 L 310 198 L 300 188 L 299 188 L 297 186 L 296 186 L 293 183 L 292 183 L 291 182 L 290 182 L 289 181 L 288 181 L 287 180 L 286 180 L 285 179 L 283 179 L 282 178 L 281 178 L 280 177 L 277 177 L 276 176 L 272 176 L 271 175 L 267 175 L 266 174 Z" fill="url(#orangeToPurple64)" stroke="url(#orangeToPurple64)" strokeWidth="8" transform="translate(0.2,1.0) scale(0.2,0.2)" />
    
  </svg>
);


export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const iconSize = size === 'lg' ? 40 : size === 'md' ? 32 : 28;
  const showText = size === 'md' || size === 'lg';

  return (
    <div className="flex items-center gap-2" title="5satoshi">
      <NewFiveSDollarLogoSVG width={iconSize} height={iconSize} />
      {showText && (
        <span className={cn(
          "font-headline text-sidebar-foreground",
          size === 'lg' ? "text-xl" : "text-lg",
          // This class will hide the text if the parent .group/sidebar-wrapper
          // has data-collapsible="icon" (which happens when sidebar is icon-only)
          // This relies on the Logo being a child of an element with .group/sidebar-wrapper
          // which is the case through SidebarProvider -> Sidebar -> SidebarHeader -> Logo
          "group-data-[collapsible=icon]/sidebar-wrapper:hidden" 
        )}>
          5satoshi
        </span>
      )}
    </div>
  );
}
